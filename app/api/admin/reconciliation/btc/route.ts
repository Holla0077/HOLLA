import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/shared/guards/auth.guard";
import { ReconciliationService } from "@/src/domains/reconciliation/services/reconciliation.service";
import { AppError } from "@/src/shared/errors/app-errors";

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN", "FINANCE");

    const url = new URL(req.url);
    const full = url.searchParams.get("full") === "true";

    const result = await ReconciliationService.reconcileBtcBalances(full);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[reconciliation/btc]", error);
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "BTC reconciliation failed" }, { status: 500 });
  }
}