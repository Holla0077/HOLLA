import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await prisma.kycDocument.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, username: true, email: true, phone: true, fullName: true, createdAt: true } },
    },
  });

  return NextResponse.json({ docs });
}

export async function PATCH(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { kycId, action, adminNote } = await req.json();
  if (!kycId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "kycId and action (approve|reject) required" }, { status: 400 });
  }

  const doc = await prisma.kycDocument.findUnique({ where: { id: kycId }, include: { user: true } });
  if (!doc) return NextResponse.json({ error: "KYC document not found" }, { status: 404 });

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
  const isVerified = action === "approve";

  await prisma.$transaction([
    prisma.kycDocument.update({
      where: { id: kycId },
      data: {
        status: newStatus,
        adminNote: adminNote ?? null,
        reviewedAt: new Date(),
        reviewedBy: "admin",
      },
    }),
    prisma.user.update({
      where: { id: doc.userId },
      data: {
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
        verificationStatus: newStatus,
      },
    }),
  ]);

  await auditLog(`kyc_${action}`, doc.userId, { kycId, adminNote: adminNote ?? null });

  return NextResponse.json({ ok: true, status: newStatus });
}
