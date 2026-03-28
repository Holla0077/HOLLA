import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const ADMIN_COOKIE = "holla_admin_session";
const JWT_SECRET = process.env.JWT_SECRET || "holla_super_secret_key_change_this";

export function signAdminToken() {
  return jwt.sign({ admin: true, iat: Date.now() }, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const p = jwt.verify(token, JWT_SECRET) as { admin?: boolean };
    return p?.admin === true;
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export { ADMIN_COOKIE };
