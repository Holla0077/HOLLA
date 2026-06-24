import { NextResponse } from "next/server";
import { AuthService } from "@/src/domains/auth/services/auth.service";
import { CryptoService } from "@/src/domains/crypto/services/crypto.service";

export async function GET(req: Request) {
  try {
    const user = await AuthService.getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { address } = await CryptoService.getOrCreateBtcAddress(user.id);
    return NextResponse.json({ address, coin: "BTC" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate address";
    console.error("[BTC address]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
