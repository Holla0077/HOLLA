import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ logs });
}
