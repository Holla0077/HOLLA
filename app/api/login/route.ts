import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/src/shared/database/prisma";
import { signToken } from "@/lib/auth";
import { rateLimit } from "@/src/shared/utils/rate-limiter";

export async function POST(req: Request) {
const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
if (!rateLimit(ip, 5, 60_000)) {   // max 5 attempts per minute
  return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
}

  try {
    const { email, password } = await req.json();

    const identifier = email as string;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
          { phone: identifier },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({ id: user.id, email: user.email });
    const res = NextResponse.json({ message: "Login successful" });

    res.cookies.set({
      name: "holla_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
