import { NextResponse } from "next/server";
import { AuthService } from "@/src/domains/auth/services/auth.service";
import { WalletService } from "@/src/domains/wallet/services/wallet.service";

export async function GET() {
  try {
    const user = await AuthService.getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const wallets = await WalletService.getUserWallets(user.id);
    return NextResponse.json({ wallets });
  } catch (e: unknown) {
    console.error("GET /api/wallets error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}