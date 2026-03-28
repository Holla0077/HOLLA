/**
 * GET /api/crypto/btc/address
 * Returns the user's Bitcoin deposit address, generating one if needed.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deriveBitcoinAddress } from "@/lib/bitcoin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if user already has a BTC address
  const existing = await prisma.cryptoAddress.findUnique({
    where: { userId_coin: { userId: session.userId, coin: "BTC" } },
  });
  if (existing) {
    return NextResponse.json({ address: existing.address, coin: "BTC" });
  }

  // Count total BTC addresses to get next HD index
  const count = await prisma.cryptoAddress.count({ where: { coin: "BTC" } });
  const hdIndex = count;

  try {
    const address = deriveBitcoinAddress(hdIndex);
    const record = await prisma.cryptoAddress.create({
      data: { userId: session.userId, coin: "BTC", address, hdIndex },
    });
    return NextResponse.json({ address: record.address, coin: "BTC" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate address";
    console.error("[BTC address]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
