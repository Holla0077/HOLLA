import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth"; // keep existing import for now

export class AuthService {
  static async getSessionUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("holla_session")?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return { id: payload.id, impersonated: payload.impersonated ?? false };
  }
}

// Standalone function for backward compatibility
export async function getSessionUser() {
  return AuthService.getSessionUser();
}