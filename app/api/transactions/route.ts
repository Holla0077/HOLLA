import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { z } from "zod";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Unknown error";
}

async function getAuthedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("holla_session")?.value;
  if (!token) return null;
  const payload = verifyToken(token) as { id?: string } | null;
  return payload?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getAuthedUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const txs = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        asset: { select: { code: true } },
      },
    });

    const uiTxs = txs.map((t) => ({
      id: t.id,
      status: t.status as "PENDING" | "COMPLETED" | "FAILED",
      rail: String(t.rail ?? ""),
      method: String(t.method ?? ""),
      asset: t.asset.code,
      amount: t.amount.toString(),
      feeTotal: t.feeTotal.toString(),
      createdAt: t.createdAt.toISOString(),
      metadata: t.metadata ?? null,
    }));

    return NextResponse.json({ transactions: uiTxs });
  } catch (e: unknown) {
    console.error("GET /api/transactions error:", e);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}

const SendSchema = z.object({
  recipientIdentifier: z.string().min(1),
  assetCode: z.string().min(1),
  amount: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const userId = await getAuthedUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, isVerified: true },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.isVerified) {
      return NextResponse.json(
        { error: "Your account must be verified before transacting. Please complete verification in Settings." },
        { status: 403 }
      );
    }
    if (!user.fullName) {
      return NextResponse.json(
        { error: "Please complete your profile (full name required) in Settings before transacting." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = SendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { recipientIdentifier, assetCode, amount } = parsed.data;

    const amountN = Number(amount);
    if (!Number.isFinite(amountN) || amountN <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({ where: { code: assetCode } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const amountMinor = BigInt(Math.round(amountN * (asset.type === "FIAT" ? 100 : 1e8)));

    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { email: recipientIdentifier },
          { username: recipientIdentifier },
          { phone: recipientIdentifier },
        ],
        NOT: { id: userId },
      },
    });
    if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

    // Pre-flight: wallet existence checks (ok outside tx — wallets are not deleted)
    const fromWallet = await prisma.wallet.findUnique({
      where: { userId_assetId: { userId, assetId: asset.id } },
    });
    if (!fromWallet) return NextResponse.json({ error: "You don't have a wallet for this asset" }, { status: 400 });

    const toWallet = await prisma.wallet.findUnique({
      where: { userId_assetId: { userId: recipient.id, assetId: asset.id } },
    });
    if (!toWallet) return NextResponse.json({ error: "Recipient does not have a wallet for this asset" }, { status: 400 });

    const tx = await prisma.$transaction(async (db) => {
      // Atomic check-and-debit in a single SQL UPDATE.
      // WHERE balance >= amountMinor means the row is only updated if funds are
      // sufficient AT THIS EXACT MOMENT — concurrent requests cannot both pass.
      const debit = await db.wallet.updateMany({
        where: { id: fromWallet.id, balance: { gte: amountMinor } },
        data: { balance: { decrement: amountMinor } },
      });
      if (debit.count === 0) {
        throw new Error("Insufficient balance");
      }

      await db.wallet.update({
        where: { id: toWallet.id },
        data: { balance: { increment: amountMinor } },
      });

      return db.transaction.create({
        data: {
          userId,
          assetId: asset.id,
          rail: "HOLLA_INTERNAL",
          method: "HOLLA_TO_HOLLA",
          status: "COMPLETED",
          amount: amountMinor,
          feeTotal: 0n,
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          metadata: { recipientId: recipient.id, recipientIdentifier },
        },
      });
    });

    return NextResponse.json({
      ok: true,
      transactionId: tx.id,
      status: "COMPLETED",
    });
  } catch (e: unknown) {
    console.error("POST /api/transactions error:", e);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
