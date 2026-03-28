import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

function unauth() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  if (!(await getAdminSession())) return unauth();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      fullName: true,
      isVerified: true,
      verifiedAt: true,
      verificationStatus: true,
      createdAt: true,
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  if (!(await getAdminSession())) return unauth();

  const { userId, isVerified } = await req.json();
  if (!userId || typeof isVerified !== "boolean") {
    return NextResponse.json({ error: "userId and isVerified required" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isVerified,
      verifiedAt: isVerified ? new Date() : null,
    },
    select: { id: true, username: true, isVerified: true, verifiedAt: true },
  });

  return NextResponse.json({ ok: true, user });
}
