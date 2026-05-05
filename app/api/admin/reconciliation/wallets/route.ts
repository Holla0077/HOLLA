import { NextResponse } from "next/server";
import { requireRole } from "@/src/shared/guards/auth.guard";
import { ReconciliationService } from "@/src/domains/reconciliation/services/reconciliation.service";

export async function GET() {
  try {
    await requireRole("ADMIN", "FINANCE");
    const result = await ReconciliationService.reconcileWallets();
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Reconciliation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}