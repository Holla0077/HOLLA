import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { z } from "zod";

const PatchSchema = z.object({
  fullName: z.string().min(1).max(80).optional().nullable(),
  username: z.string().min(3).max(40).optional(),
  gender: z.string().min(1).max(20).optional().nullable(),
  dob: z.string().optional().nullable(),
});

function formatDob(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().split("T")[0];
}

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
      isVerified: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      gender: user.gender,
      dob: formatDob(user.dateOfBirth),
      verified: user.isVerified,
    },
    phones: [
      {
        id: user.id,
        number: user.phone,
        verified: user.isVerified,
      },
    ],
    kyc: {
      idVerified: user.isVerified,
      bvnVerified: false,
    },
  });
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

  const { fullName, username, gender, dob } = parsed.data;

  if (username !== undefined) {
    const conflict = await prisma.user.findFirst({
      where: { username, NOT: { id: session.id } },
    });
    if (conflict) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      ...(fullName !== undefined ? { fullName: fullName || null } : {}),
      ...(username !== undefined ? { username } : {}),
      ...(gender !== undefined ? { gender: gender || null } : {}),
      ...(dob !== undefined
        ? { dateOfBirth: dob ? new Date(dob + "T00:00:00.000Z") : null }
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
      isVerified: true,
    },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      gender: user.gender,
      dob: formatDob(user.dateOfBirth),
      verified: user.isVerified,
    },
    phones: [{ id: user.id, number: user.phone, verified: user.isVerified }],
    kyc: { idVerified: user.isVerified, bvnVerified: false },
  });
}
