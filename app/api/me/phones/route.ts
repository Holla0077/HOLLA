import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { z } from "zod";

const PostSchema = z.object({
  number: z.string().min(7).max(20),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const { number } = parsed.data;

    const conflict = await prisma.user.findFirst({
      where: { phone: number, NOT: { id: session.id } },
    });
    if (conflict) return NextResponse.json({ error: "Phone number already in use" }, { status: 409 });

    await prisma.user.update({
      where: { id: session.id },
      data: { phone: number },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/me/phones error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ error: "Primary phone number cannot be deleted" }, { status: 400 });
}
