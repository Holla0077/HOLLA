// app/api/support/conversations/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth.server";

export async function GET() {
  try {
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let convo = await prisma.supportConversation.findFirst({
      where: { userId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });

    if (!convo) {
      convo = await prisma.supportConversation.create({
        data: { userId, status: "OPEN" },
      });

      await prisma.supportMessage.create({
        data: {
          conversationId: convo.id,
          sender: "SYSTEM",
          body: "Hi! A support agent will respond shortly. Please describe your issue.",
        },
      });
    }

    return NextResponse.json({ conversation: convo });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}