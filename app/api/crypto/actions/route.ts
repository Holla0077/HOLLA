import { NextResponse } from "next/server";
import prisma from "@/src/shared/database/prisma";
import { AuthService } from "@/src/domains/auth/services/auth.service";
import type { TransactionMethod } from "@prisma/client";

const CRYPTO_METHODS: Record<string, TransactionMethod> = {
  BTC: "BTC",
  ETH: "ETH",
  USDT_ERC20: "USDT_ERC20",
  USDC_ERC20: "USDC_ERC20",
  LTC: "LTC",
  DASH: "DASH",
  BCH: "BCH",
};

export async function POST(req: Request) {
  try {
    const user = await AuthService.getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, assetCode, amount } = await req.json().catch(() => ({}));
    if (!["BUY", "SELL"].includes(action)) {
      return NextResponse.json({ error: "Unsupported crypto action" }, { status: 400 });
    }

    const amountNumber = Number(amount);
    if (!assetCode || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: "assetCode and valid amount are required" }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({ where: { code: assetCode } });
    if (!asset || asset.type !== "CRYPTO") {
      return NextResponse.json({ error: "Crypto asset not found" }, { status: 404 });
    }

    const method = CRYPTO_METHODS[assetCode];
    if (!method) {
      return NextResponse.json({ error: "Unsupported crypto asset" }, { status: 400 });
    }

    const amountMinor = BigInt(Math.round(amountNumber * 100_000_000));
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        assetId: asset.id,
        rail: "BLOCKCHAIN",
        method,
        status: "PENDING",
        amount: amountMinor,
        feeTotal: 0n,
        metadata: { type: action },
      },
    });

    return NextResponse.json({
      ok: true,
      status: "PENDING",
      transactionId: transaction.id,
      message: `${action === "BUY" ? "Buy" : "Sell"} request submitted.`,
    });
  } catch (error) {
    console.error("POST /api/crypto/actions error:", error);
    const message = error instanceof Error ? error.message : "Failed to submit crypto action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
