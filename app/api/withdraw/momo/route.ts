import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
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
    const cookieStore = await cookies();
    const token = cookieStore.get("holla_session")?.value;
    if (!token) return bad("Unauthorized", 401);

    const payload = verifyToken(token) as { id?: string } | null;
    const userId = payload?.id;
    if (!userId) return bad("Unauthorized", 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId },
      include: { asset: true },
    });
    if (!wallet) return bad("Wallet not found", 404);
    if (wallet.asset?.code !== "GHS") return bad("MoMo withdraw is only for GHS wallet", 400);

    if (wallet.balance < amountPesewas) return bad("Insufficient balance", 400);

    const tx = await prisma.$transaction(async (db) => {
      await db.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amountPesewas } },
      });

      return db.transaction.create({
        data: {
          userId,
          assetId: wallet.assetId,
          rail: "GHANA",
          method: networkToMethod(network),
          status: "PENDING",
          amount: amountPesewas,
          feeTotal: 0n,
          fromWalletId: walletId,
          metadata: { phone, network, type: "WITHDRAW" },
        },
      });
    });

    return NextResponse.json({ ok: true, transactionId: tx.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return bad(msg, 500);
  }
}
