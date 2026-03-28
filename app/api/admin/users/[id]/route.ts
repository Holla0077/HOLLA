import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

function fmtBigInt(v: bigint, asset: string): string {
  if (asset === "GHS") {
    const n = Number(v);
    return `GH₵ ${(n / 100).toFixed(2)}`;
  }
  return (Number(v) / 1e8).toFixed(8);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, email: true, phone: true,
      fullName: true, gender: true, dateOfBirth: true,
      isVerified: true, verificationStatus: true, verifiedAt: true, createdAt: true,
      wallets: {
        include: { asset: { select: { code: true, name: true, type: true } } },
      },
      kycDocument: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const txs = await prisma.transaction.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { asset: { select: { code: true } } },
  });

  const wallets = user.wallets.map((w) => ({
    id: w.id,
    asset: w.asset.code,
    assetName: w.asset.name,
    type: w.asset.type,
    balance: w.balance.toString(),
    balanceFmt: fmtBigInt(w.balance, w.asset.code),
  }));

  const transactions = txs.map((t) => ({
    id: t.id,
    status: t.status,
    rail: t.rail,
    method: t.method,
    asset: t.asset.code,
    amount: t.amount.toString(),
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json({
    user: {
      ...user,
      wallets: undefined,
      kycDocument: undefined,
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
      verifiedAt: user.verifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    wallets,
    transactions,
    kycDocument: user.kycDocument,
  });
}
