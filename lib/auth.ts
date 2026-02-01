// FILE: lib/auth.ts
import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET || "holla_super_secret_key_change_this";

export type SessionTokenPayload = {
  id: string;
  email?: string;
};

export function signToken(payload: SessionTokenPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionTokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as SessionTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Reads auth token from cookies and returns the logged-in user's id.
 * IMPORTANT: update COOKIE_NAME if your app uses a different cookie name.
 */
const COOKIE_NAME = "token"; // <-- change if your cookie is named differently

export async function getAuthedUserId(req: Request): Promise<string> {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];

  if (!token) throw new Error("Unauthorized");

  const payload = verifyToken(decodeURIComponent(token));
  if (!payload?.id) throw new Error("Unauthorized");

  return payload.id;
}
