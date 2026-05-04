import { NextRequest, NextResponse } from "next/server";
import prisma from "@/src/shared/database/prisma";
import { requireRole } from "@/src/shared/guards/auth.guard";

export async function PUT(req: NextRequest) {
  try {
    await requireRole("ADMIN"); // only admins

    const body = await req.json();
    const { kycId, status, adminNote } = body;

    if (!kycId || !status) {
      return NextResponse.json({ error: "Missing kycId or status" }, { status: 400 });
    }

    // Map old-approved/rejected to new values if needed, or accept only new values
    let newStatus: "VERIFIED" | "UNVERIFIED" | "PENDING";
    if (status === "APPROVED" || status === "VERIFIED") newStatus = "VERIFIED";
    else if (status === "REJECTED" || status === "UNVERIFIED") newStatus = "UNVERIFIED";
    else if (status === "PENDING") newStatus = "PENDING";
    else return NextResponse.json({ error: "Invalid status value" }, { status: 400 });

    const updated = await prisma.kycDocument.update({
      where: { id: kycId },
      data: {
        status: newStatus,
        adminNote: adminNote ?? null,
        reviewedAt: new Date(),
        reviewedBy: "admin", // or use authenticated user's ID
      },
    });

    return NextResponse.json({ success: true, kyc: updated });
  } catch (error) {
    console.error("[admin/kyc]", error);
    const message = error instanceof Error ? error.message : "KYC update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}