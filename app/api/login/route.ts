import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

// "email" field from body actually carries email OR username OR phone
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
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // NOTE: our Prisma schema calls this field "passwordHash"
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create JWT with basic user info
const token = signToken({
  id: user.id,
  email: user.email,
});

const res = NextResponse.json({ message: "Login successful" });

// ✅ IMPORTANT: set cookie with correct local-dev flags
res.cookies.set({
  name: "holla_session",
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // false on localhost
  sameSite: "lax", // ✅ lax is safer for dev than strict
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
});

return res;

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
