import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { requestToPay, normalizePhone } from "@/lib/mtn-momo";
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
      select: { fullName: true, isVerified: true, phone: true },
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
    if (amountPesewas < 100n) return bad("Minimum top-up is GH₵ 1.00");
    if (amountPesewas > 1000000n) return bad("Maximum top-up is GH₵ 10,000.00 per transaction");

    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: session.id },
      include: { asset: true },
    });
    if (!wallet) return bad("Wallet not found", 404);
    if (wallet.asset?.code !== "GHS") return bad("MoMo top-up is only for your GHS wallet", 400);

    // Determine if we have live MTN credentials
    const isMtn = network.toUpperCase() === "MTN";
    const hasMtnCreds = !!(process.env.MTN_CONSUMER_KEY && process.env.MTN_COLLECTION_KEY);

    // Create the topup request record first (PENDING)
    const topupReq = await prisma.topupRequest.create({
      data: {
        userId: session.id,
        walletId,
        amount: amountPesewas,
        phone: normalizePhone(phone),
        network: network.toUpperCase(),
        status: "PENDING",
      },
    });

    if (isMtn && hasMtnCreds) {
      // ── LIVE MTN FLOW ──
      // Send request-to-pay. MTN will USSD push the customer.
      // We return immediately with PENDING status — wallet is credited by the webhook/poll.
      let referenceId: string;
      try {
        const result = await requestToPay(
          phone,
          amountPesewas,
          `Holla top-up GH₵ ${(Number(amountPesewas) / 100).toFixed(2)}`
        );
        referenceId = result.referenceId;
      } catch (momoErr) {
        // Mark request as failed
        await prisma.topupRequest.update({
          where: { id: topupReq.id },
          data: { status: "FAILED", failureReason: momoErr instanceof Error ? momoErr.message : "MTN error" },
        });
        const msg = momoErr instanceof Error ? momoErr.message : "MTN MoMo request failed";
        return bad(msg, 502);
      }

      // Save referenceId for polling / callback matching
      await prisma.topupRequest.update({
        where: { id: topupReq.id },
        data: { externalRef: referenceId },
      });

      // Create a PENDING transaction record
      const tx = await prisma.transaction.create({
        data: {
          userId: session.id,
          assetId: wallet.assetId,
          rail: "GHANA",
          method: networkToMethod(network),
          status: "PENDING",
          amount: amountPesewas,
          feeTotal: 0n,
          toWalletId: walletId,
          reference: referenceId,
          metadata: {
            topupRequestId: topupReq.id,
            phone: normalizePhone(phone),
            network: network.toUpperCase(),
            type: "TOPUP",
          },
        },
      });

      await prisma.topupRequest.update({
        where: { id: topupReq.id },
        data: { transactionId: tx.id },
      });

      return NextResponse.json({
        ok: true,
        status: "PENDING",
        message: "A payment request has been sent to your MTN MoMo number. Please approve it on your phone.",
        topupRequestId: topupReq.id,
        transactionId: tx.id,
        referenceId,
      });
    } else {
      // ── NON-MTN or sandbox fallback: credit immediately ──
      // For Telecel / AT Money we don't yet have live credentials.
      // Credit the wallet instantly as a demo until those integrations are added.
      const { tx } = await prisma.$transaction(async (db) => {
        await db.topupRequest.update({
          where: { id: topupReq.id },
          data: { status: "COMPLETED", providerStatus: "SUCCESSFUL" },
        });

        await db.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: amountPesewas } },
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
            toWalletId: walletId,
            metadata: {
              topupRequestId: topupReq.id,
              phone: normalizePhone(phone),
              network: network.toUpperCase(),
              type: "TOPUP",
              note: "Non-MTN network — credited immediately (demo)",
            },
          },
        });

        await db.topupRequest.update({ where: { id: topupReq.id }, data: { transactionId: tx.id } });
        return { tx };
      });

      return NextResponse.json({
        ok: true,
        status: "COMPLETED",
        message: `Top-up of GH₵ ${(Number(amountPesewas) / 100).toFixed(2)} successful.`,
        topupRequestId: topupReq.id,
        transactionId: tx.id,
      });
    }
  } catch (e) {
    console.error("[topup/momo]", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return bad(msg, 500);
  }
}
