/**
 * GET /api/crypto/btc/address
 * Returns the user's Bitcoin deposit address, generating one if needed.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { deriveBitcoinAddress } from "@/lib/bitcoin";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.cryptoAddress.findUnique({
    where: { userId_coin: { userId: session.id, coin: "BTC" } },
  });
  if (existing) {
    return NextResponse.json({ address: existing.address, coin: "BTC" });
  }

  const count = await prisma.cryptoAddress.count({ where: { coin: "BTC" } });
  const hdIndex = count;

  try {
    const address = deriveBitcoinAddress(hdIndex);
    const record = await prisma.cryptoAddress.create({
      data: { userId: session.id, coin: "BTC", address, hdIndex },
    });
    return NextResponse.json({ address: record.address, coin: "BTC" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate address";
    console.error("[BTC address]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
