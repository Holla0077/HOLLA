import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

function toPesewas(amountGhs: string) {
  const n = Number(amountGhs);
  if (!Number.isFinite(n) || n <= 0) return null;
  return BigInt(Math.round(n * 100));
}

function maskCard(cardNumber: string) {
  const digits = cardNumber.replace(/\s/g, "");
  return "**** **** **** " + digits.slice(-4);
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
    if (!user.isVerified)
      return bad("Your account must be verified before transacting. Please complete verification in Settings.", 403);
    if (!user.fullName)
      return bad("Please complete your profile (full name required) in Settings before transacting.", 403);

    const body = await req.json();
    const { walletId, amount, cardNumber, cardName, expiry, cvv } = body ?? {};

    if (!walletId) return bad("walletId is required");
    if (!amount || typeof amount !== "string") return bad("amount is required");
    if (!cardNumber || typeof cardNumber !== "string") return bad("Card number is required");
    if (!cardName || typeof cardName !== "string") return bad("Cardholder name is required");
    if (!expiry || typeof expiry !== "string") return bad("Card expiry is required");
    if (!cvv || typeof cvv !== "string") return bad("CVV is required");

    const digitsOnly = cardNumber.replace(/\s/g, "");
    if (digitsOnly.length < 13 || digitsOnly.length > 19) return bad("Invalid card number");
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return bad("Expiry must be MM/YY");
    if (!/^\d{3,4}$/.test(cvv)) return bad("CVV must be 3 or 4 digits");

    const amountPesewas = toPesewas(amount);
    if (!amountPesewas) return bad("Enter a valid amount");
    if (amountPesewas < 100n) return bad("Minimum topup is GH₵ 1.00");

    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId },
      include: { asset: true },
    });
    if (!wallet) return bad("Wallet not found", 404);
    if (wallet.asset?.code !== "GHS") return bad("Card topup is only for GHS wallet", 400);

    // Atomically: credit wallet + create completed transaction
    const tx = await prisma.$transaction(async (db) => {
      await db.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amountPesewas } },
      });

      return db.transaction.create({
        data: {
          userId,
          assetId: wallet.assetId,
          rail: "GHANA",
          method: "VISA_CARD",
          status: "COMPLETED",
          amount: amountPesewas,
          feeTotal: 0n,
          toWalletId: walletId,
          metadata: {
            type: "TOPUP",
            cardMasked: maskCard(cardNumber),
            cardName,
            expiry,
          },
        },
      });
    });

    return NextResponse.json({ ok: true, transactionId: tx.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return bad(msg, 500);
  }
}
