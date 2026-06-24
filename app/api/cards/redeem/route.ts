import { NextResponse } from "next/server";
import prisma from "@/src/shared/database/prisma";
import { AuthService } from "@/src/domains/auth/services/auth.service";
import { CardService } from "@/src/domains/cards/services/card.service";

export async function POST(req: Request) {
  try {
    const user = await AuthService.getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, amount } = await req.json().catch(() => ({}));
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Card code is required" }, { status: 400 });
    }

    const card = await prisma.card.findFirst({
      where: {
        id: code.trim(),
        OR: [{ ownerId: user.id }, { ownerId: null }],
      },
    });

    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    if (!card.ownerId) {
      const activated = await prisma.card.update({
        where: { id: card.id },
        data: {
          ownerId: user.id,
          status: "ACTIVATED",
          activatedAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Card redeemed successfully",
        card: {
          id: activated.id,
          type: activated.type,
          status: activated.status,
          currency: activated.currency,
          remainingValue: activated.remainingValue.toString(),
        },
      });
    }

    const redeemAmount =
      amount && Number.isFinite(Number(amount))
        ? BigInt(Math.round(Number(amount) * 100))
        : card.remainingValue;
    const result = await CardService.redeemCard(card.id, redeemAmount);

    return NextResponse.json({
      ok: true,
      message: "Card redeemed successfully",
      ...result,
    });
  } catch (error) {
    console.error("POST /api/cards/redeem error:", error);
    const message = error instanceof Error ? error.message : "Failed to redeem card";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
