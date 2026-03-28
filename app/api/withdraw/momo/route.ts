import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { transfer, normalizePhone } from "@/lib/mtn-momo";
import { TransactionMethod } from "@prisma/client";

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

function toPesewas(amountGhs: string) {
  const n = Number(amountGhs);
  if (!Number.isFinite(n) || n <= 0) return null;
  return BigInt(Math.round(n * 100));
}

function networkToMethod(network: string): TransactionMethod {
  const n = network.toUpperCase();
  if (n === "MTN") return "MTN_MOMO";
  if (n === "TELECEL" || n === "VODAFONE") return "TELECEL_MOMO";
  if (n === "AIRTELTIGO" || n === "AT") return "AT_MONEY";
  return "MTN_MOMO";
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return bad("Unauthorized", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { fullName: true, isVerified: true },
    });
    if (!user) return bad("Unauthorized", 401);
    if (!user.isVerified) return bad("Your account must be verified before transacting. Please complete verification in Settings.", 403);
    if (!user.fullName) return bad("Please complete your profile (full name required) in Settings before transacting.", 403);

    const body = await req.json();
    const { walletId, amount, phone, network } = body ?? {};

    if (!walletId) return bad("walletId is required");
    if (!phone || typeof phone !== "string") return bad("phone is required");
    if (!network || typeof network !== "string") return bad("network is required");
    if (!amount || typeof amount !== "string") return bad("amount is required");

    const amountPesewas = toPesewas(amount);
    if (!amountPesewas) return bad("Enter a valid amount");
    if (amountPesewas < 100n) return bad("Minimum withdrawal is GH₵ 1.00");
    if (amountPesewas > 1000000n) return bad("Maximum withdrawal is GH₵ 10,000.00 per transaction");

    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: session.id },
      include: { asset: true },
    });
    if (!wallet) return bad("Wallet not found", 404);
    if (wallet.asset?.code !== "GHS") return bad("MoMo withdrawal is only for your GHS wallet", 400);
    if (wallet.balance < amountPesewas) return bad("Insufficient balance", 400);

    const isMtn = network.toUpperCase() === "MTN";
    const hasMtnCreds = !!(process.env.MTN_CONSUMER_KEY && process.env.MTN_DISBURSEMENT_KEY);

    if (isMtn && hasMtnCreds) {
      // ── LIVE MTN FLOW ──
      // Deduct balance immediately (hold funds), then disburse.
      // If MTN disbursement fails, refund the balance.

      const withReq = await prisma.$transaction(async (db) => {
        // Check balance again inside transaction to avoid race conditions
        const freshWallet = await db.wallet.findUnique({ where: { id: walletId } });
        if (!freshWallet || freshWallet.balance < amountPesewas) {
          throw new Error("Insufficient balance");
        }

        await db.wallet.update({
          where: { id: walletId },
          data: { balance: { decrement: amountPesewas } },
        });

        const tx = await db.transaction.create({
          data: {
            userId: session.id,
            assetId: wallet.assetId,
            rail: "GHANA",
            method: networkToMethod(network),
            status: "PENDING",
            amount: amountPesewas,
            feeTotal: 0n,
            fromWalletId: walletId,
            metadata: { phone: normalizePhone(phone), network: network.toUpperCase(), type: "WITHDRAW" },
          },
        });

        const withReq = await db.withdrawRequest.create({
          data: {
            userId: session.id,
            walletId,
            amount: amountPesewas,
            phone: normalizePhone(phone),
            network: network.toUpperCase(),
            status: "PENDING",
            transactionId: tx.id,
          },
        });

        return withReq;
      });

      // Call MTN Disbursement API
      let referenceId: string;
      try {
        const result = await transfer(
          phone,
          amountPesewas,
          `Holla withdrawal GH₵ ${(Number(amountPesewas) / 100).toFixed(2)}`
        );
        referenceId = result.referenceId;
      } catch (momoErr) {
        // Refund the deducted amount
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: amountPesewas } },
          }),
          prisma.withdrawRequest.update({
            where: { id: withReq.id },
            data: { status: "FAILED", failureReason: momoErr instanceof Error ? momoErr.message : "MTN error" },
          }),
          ...(withReq.transactionId ? [prisma.transaction.update({
            where: { id: withReq.transactionId },
            data: { status: "FAILED" },
          })] : []),
        ]);
        const msg = momoErr instanceof Error ? momoErr.message : "MTN disbursement failed";
        return bad(msg, 502);
      }

      await prisma.withdrawRequest.update({
        where: { id: withReq.id },
        data: { externalRef: referenceId },
      });
      if (withReq.transactionId) {
        await prisma.transaction.update({
          where: { id: withReq.transactionId },
          data: { reference: referenceId },
        });
      }

      return NextResponse.json({
        ok: true,
        status: "PENDING",
        message: "Withdrawal submitted. Funds will arrive on your MTN MoMo within a few minutes.",
        withdrawRequestId: withReq.id,
        transactionId: withReq.transactionId,
        referenceId,
      });
    } else {
      // ── NON-MTN / fallback: deduct immediately, mark completed ──
      const tx = await prisma.$transaction(async (db) => {
        const freshWallet = await db.wallet.findUnique({ where: { id: walletId } });
        if (!freshWallet || freshWallet.balance < amountPesewas) {
          throw new Error("Insufficient balance");
        }

        await db.wallet.update({
          where: { id: walletId },
          data: { balance: { decrement: amountPesewas } },
        });

        const tx = await db.transaction.create({
          data: {
            userId: session.id,
            assetId: wallet.assetId,
            rail: "GHANA",
            method: networkToMethod(network),
            status: "COMPLETED",
            amount: amountPesewas,
            feeTotal: 0n,
            fromWalletId: walletId,
            metadata: {
              phone: normalizePhone(phone),
              network: network.toUpperCase(),
              type: "WITHDRAW",
              note: "Non-MTN network — processed immediately (demo)",
            },
          },
        });

        await db.withdrawRequest.create({
          data: {
            userId: session.id,
            walletId,
            amount: amountPesewas,
            phone: normalizePhone(phone),
            network: network.toUpperCase(),
            status: "COMPLETED",
            providerStatus: "SUCCESSFUL",
            transactionId: tx.id,
          },
        });

        return tx;
      });

      return NextResponse.json({
        ok: true,
        status: "COMPLETED",
        message: `GH₵ ${(Number(amountPesewas) / 100).toFixed(2)} withdrawal initiated successfully.`,
        transactionId: tx.id,
      });
    }
  } catch (e) {
    console.error("[withdraw/momo]", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return bad(msg, 500);
  }
}
