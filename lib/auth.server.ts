import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function getUserIdFromRequest(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("holla_session")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.id ?? null;
}
