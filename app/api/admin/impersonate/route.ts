import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { signToken } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const token = signToken({ id: user.id, email: user.email, impersonated: true });

  await auditLog("impersonate_start", user.id, { username: user.username });

  const res = NextResponse.json({ ok: true, redirect: "/app/home" });
  res.cookies.set("holla_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 2, // 2 hours max
    path: "/",
  });
  return res;
}
