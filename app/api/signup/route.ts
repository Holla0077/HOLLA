import { ensureCoreAssetsAndUserWallets } from "@/lib/bootstrap";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const signupSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(7),
  password: z.string().min(6),
  acceptTerms: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();

    const parsed = signupSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { username, email, phone, password, acceptTerms } = parsed.data;

    if (!acceptTerms) {
      return NextResponse.json(
        { error: "You must accept the terms" },
        { status: 400 }
      );
    }

    // Check if any of email/username/phone is already used
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }, { phone }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User with same email/username/phone already exists" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
  data: {
    username,
    email,
    phone,
    passwordHash: hashed,
  },
});

// ✅ Create default wallets for all assets
const assets = await prisma.asset.findMany();

if (assets.length > 0) {
  await prisma.wallet.createMany({
    data: assets.map((a) => ({
      userId: user.id,
      assetId: a.id,
      balance: BigInt(0),
    })),
    skipDuplicates: true,
  });
}

await ensureCoreAssetsAndUserWallets(user.id);

    return NextResponse.json(
      {
        message: "User created successfully",
        user: { id: user.id, email: user.email, username: user.username },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
