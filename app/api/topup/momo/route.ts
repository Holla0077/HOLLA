import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

function toPesewas(amountGhs: string) {
  // supports "10", "10.5", "10.50"
  const n = Number(amountGhs);
  if (!Number.isFinite(n) || n <= 0) return null;
  return BigInt(Math.round(n * 100));
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("holla_session")?.value; // keep your cookie name
    if (!token) return bad("Unauthorized", 401);

    const payload = verifyToken(token) as { id?: string } | null;
    const userId = payload?.id;
    if (!userId) return bad("Unauthorized", 401);

    const body = await req.json();
    const { walletId, amount, phone, network } = body ?? {};

    if (!walletId) return bad("walletId is required");
    if (!phone || typeof phone !== "string") return bad("phone is required");
    if (!network || typeof network !== "string") return bad("network is required");
    if (!amount || typeof amount !== "string") return bad("amount is required");

    const amountPesewas = toPesewas(amount);
    if (!amountPesewas) return bad("Enter a valid amount");

    // confirm wallet belongs to user and is GHS fiat wallet
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId },
      include: { asset: true }, // adjust if your schema differs
    });

    if (!wallet) return bad("Wallet not found", 404);
    if (wallet.asset?.code !== "GHS") return bad("MoMo topup is only for GHS wallet", 400);

    const topup = await prisma.topupRequest.create({
      data: {
        userId,
        walletId,
        amount: amountPesewas,
        phone,
        network,
        status: "PENDING",
      },
    });

    // OPTIONAL: also create a pending Transaction record if your app expects it
    // (Adjust fields to match your Transaction model)
    await prisma.transaction.create({
      data: {
        userId,
        walletId,
        rail: "MOMO",
        method: "TOPUP",
        status: "PENDING",
        amount: amountPesewas,
        feeTotal: 0n,
        metadata: { topupRequestId: topup.id, phone, network },
      },
    });

    return NextResponse.json({ ok: true, topupRequestId: topup.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return bad(msg, 500);
  }
}
