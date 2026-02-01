// FILE: app/lib/auth.server.ts
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function getUserIdFromRequest(): Promise<string | null> {
  const cookieStore = await cookies(); // <- fixes TS "get" underline in newer Next
  const token = cookieStore.get("session")?.value; // cookie name must match login

  if (!token) return null;

  const payload = verifyToken(token);
  return payload?.id ?? null;
}