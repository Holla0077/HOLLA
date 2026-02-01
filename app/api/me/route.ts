import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { z } from "zod";

const PatchSchema = z.object({
  fullName: z.string().min(1).max(80).optional(),
  gender: z.string().min(1).max(20).optional(),
  dateOfBirth: z.string().optional(), // expect ISO or yyyy-mm-dd from UI
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      fullName: true,
      gender: true,
      dateOfBirth: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fullName, gender, dateOfBirth } = parsed.data;

  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(dateOfBirth !== undefined
        ? { dateOfBirth }
        : {}),
    },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      fullName: true,
      gender: true,
      dateOfBirth: true,
    },
  });

  return NextResponse.json({ user });
}
