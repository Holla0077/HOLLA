import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth"; // keep existing import for now

export class AuthService {
  static async getSessionUser(req?: Request) {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("holla_session")?.value;
    const authHeader = req?.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;
    const token = cookieToken || bearerToken;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return { id: payload.id, impersonated: payload.impersonated ?? false };
  }
}

// Standalone function for backward compatibility
export async function getSessionUser(req?: Request) {
  return AuthService.getSessionUser(req);
}
