// FILE: app/api/support/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth.server";

type PostBody = {
  conversationId: string;
  body: string;
};

function isPostBody(x: unknown): x is PostBody {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.conversationId === "string" && typeof o.body === "string";
}

export async function GET(req: Request) {
  try {
    const userId =await getUserIdFromRequest();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

    const convo = await prisma.supportConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const messages = await prisma.supportMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return NextResponse.json({ messages });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const userId =await getUserIdFromRequest();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw: unknown = await req.json();
    if (!isPostBody(raw)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const conversationId = raw.conversationId.trim();
    const text = raw.body.trim();

    if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    if (!text) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

    const convo = await prisma.supportConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const msg = await prisma.supportMessage.create({
      data: {
        conversationId,
        sender: "USER",
        body: text,
      },
    });

    return NextResponse.json({ message: msg });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
