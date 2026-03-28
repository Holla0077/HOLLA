import { NextResponse } from "next/server";
import { signAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({ error: "Admin password not configured. Set ADMIN_PASSWORD secret." }, { status: 503 });
    }

    if (!password || password !== adminPassword) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const token = signAdminToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
