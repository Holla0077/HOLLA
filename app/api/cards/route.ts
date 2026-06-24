import { NextResponse } from "next/server";
import prisma from "@/src/shared/database/prisma";
import { AuthService } from "@/src/domains/auth/services/auth.service";

export async function GET(req: Request) {
  try {
    const user = await AuthService.getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cards = await prisma.card.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        currency: true,
        initialValue: true,
        remainingValue: true,
        isReloadable: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      cards: cards.map((card) => ({
        ...card,
        initialValue: card.initialValue.toString(),
        remainingValue: card.remainingValue.toString(),
        expiresAt: card.expiresAt?.toISOString() ?? null,
        createdAt: card.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/cards error:", error);
    const message = error instanceof Error ? error.message : "Failed to load cards";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
