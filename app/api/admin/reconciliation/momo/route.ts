import { NextResponse } from "next/server";
import { requireRole } from "@/src/shared/guards/auth.guard";
import { ReconciliationService } from "@/src/domains/reconciliation/services/reconciliation.service";

export async function GET() {
  try {
    await requireRole("ADMIN", "FINANCE");
    const result = await ReconciliationService.reconcileMomoRequests();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[reconciliation/momo]", error);
    const message = error instanceof Error ? error.message : "MoMo reconciliation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}