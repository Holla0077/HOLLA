import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, username: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Expire any existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() }, // Invalidate old tokens
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: rawToken,
        expiresAt,
      },
    });

    // In production: send rawToken via email.
    // For now: return the token directly (development/demo only).
    return NextResponse.json({
      ok: true,
      _devToken: rawToken, // Remove this field when email is configured
    });
  } catch (e) {
    console.error("forgot-password error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
