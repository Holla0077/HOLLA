import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, credential } = body;

    if (!username || !credential) {
      return NextResponse.json({ error: "Username and credential required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.active) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    let valid = false;

    if (user.role === "WAITER") {
      if (!user.pinHash) {
        return NextResponse.json({ error: "PIN not set" }, { status: 401 });
      }
      valid = await bcrypt.compare(credential, user.pinHash);
    } else {
      if (!user.passwordHash) {
        return NextResponse.json({ error: "Password not set" }, { status: 401 });
      }
      valid = await bcrypt.compare(credential, user.passwordHash);
    }

    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({ id: user.id, role: user.role });

    const response = NextResponse.json({
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
