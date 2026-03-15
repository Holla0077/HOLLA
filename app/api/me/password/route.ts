import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { z } from "zod";

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/me/password error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
