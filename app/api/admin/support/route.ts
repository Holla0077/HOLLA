import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.supportConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
      },
    },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: conversations.map((c) => c.userId) } },
    select: { id: true, username: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const result = conversations.map((c) => ({
    ...c,
    user: userMap[c.userId] ?? null,
  }));

  return NextResponse.json({ conversations: result });
}
