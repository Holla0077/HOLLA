import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, body } = await req.json();
  if (!conversationId || !body?.trim()) {
    return NextResponse.json({ error: "conversationId and body required" }, { status: 400 });
  }

  const convo = await prisma.supportConversation.findUnique({ where: { id: conversationId } });
  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const message = await prisma.supportMessage.create({
    data: {
      conversationId,
      sender: "AGENT",
      body: body.trim(),
    },
  });

  await prisma.supportConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, message });
}
