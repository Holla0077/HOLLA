import { NextResponse } from "next/server";
import prisma from "@/src/shared/database/prisma";
import { AuthService } from "@/src/domains/auth/services/auth.service";

export async function GET(req: Request) {
  try {
    const user = await AuthService.getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });

    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json({
      pointsBalance: 0,
      referralCode: `KASH-${profile.username || profile.id.slice(0, 8)}`.toUpperCase(),
      totalReferrals: 0,
      lifetimeRewards: 0,
      bonus: "Invite friends and earn KASH Points when referral rewards go live.",
      history: [],
    });
  } catch (error) {
    console.error("GET /api/referrals error:", error);
    const message = error instanceof Error ? error.message : "Failed to load referrals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
