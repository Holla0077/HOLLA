import prisma from "@/lib/prisma";

export async function auditLog(action: string, targetUserId?: string, meta?: Record<string, unknown>) {
  try {
    await prisma.adminAuditLog.create({
      data: { action, targetUserId: targetUserId ?? null, meta: meta ?? null },
    });
  } catch (e) {
    console.error("[AuditLog] Failed to write:", e);
  }
}
