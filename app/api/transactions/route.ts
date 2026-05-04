import { NextResponse } from "next/server";
import prisma from "@/src/shared/database/prisma";
import { AuthService } from "@/src/domains/auth/services/auth.service";
import { TransferService } from "@/src/domains/wallet/services/transfer.service";
import { z } from "zod";

const SendSchema = z.object({
  recipientIdentifier: z.string().min(1),
  assetCode: z.string().min(1),
  amount: z.string().min(1),
});

export async function GET() {
  try {
    const user = await AuthService.getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const txs = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { asset: { select: { code: true } } },
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
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await AuthService.getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sender = await prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true, isVerified: true },
    });
    if (!sender) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!sender.isVerified)
      return NextResponse.json(
        { error: "Your account must be verified before transacting." },
        { status: 403 }
      );
    if (!sender.fullName)
      return NextResponse.json(
        { error: "Please complete your profile (full name required) before transacting." },
        { status: 403 }
      );

    const body = await req.json().catch(() => ({}));
    const parsed = SendSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });

    const { recipientIdentifier, assetCode, amount } = parsed.data;
    const amountN = Number(amount);
    if (!Number.isFinite(amountN) || amountN <= 0)
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const result = await TransferService.internalTransfer({
      senderId: user.id,
      recipientIdentifier,
      assetCode,
      amount: amountN,
    });

    return NextResponse.json({
      ok: true,
      transactionId: result.transactionId,
      status: "COMPLETED",
    });
  } catch (e: unknown) {
    console.error("POST /api/transactions error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}