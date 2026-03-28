import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("holla_session")?.value;
  if (token) {
    const payload = verifyToken(token);
    if (payload?.impersonated) {
      await auditLog("impersonate_end", payload.id, {});
    }
  }

  const res = NextResponse.json({ ok: true, redirect: "/admin/dashboard" });
  res.cookies.set("holla_session", "", { maxAge: 0, path: "/" });
  return res;
}
