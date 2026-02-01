// FILE: app/api/transactions/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Unknown error";
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("holla_session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token) as { id?: string } | null;
    const userId = payload?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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