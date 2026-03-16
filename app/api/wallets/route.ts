// FILE: app/api/wallets/route.ts
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

    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        asset: {
          select: { code: true, name: true, type: true },
        },
      },
    });

    // Flatten into the exact shape your Home page expects
    const uiWallets = wallets.map((w) => ({
      id: w.id,
      assetId: w.assetId,
      code: w.asset.code,
      name: w.asset.name,
      type: w.asset.type as "FIAT" | "CRYPTO",
      balance: w.balance.toString(), // BigInt -> string
    }));

    return NextResponse.json({ wallets: uiWallets });
  } catch (e: unknown) {
    console.error("GET /api/wallets error:", e);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}