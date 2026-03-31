import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function auditLog(action: string, targetUserId?: string, meta?: Record<string, unknown>) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        action,
        targetUserId: targetUserId ?? null,
        meta: meta !== undefined ? (meta as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (e) {
    console.error("[AuditLog] Failed to write:", e);
  }
}
