import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return "buz_dev_secret_not_for_production";
}

export type Role = "CEO" | "MANAGER" | "WAITER";

export type TokenPayload = {
  id: string;
  role: Role;
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "12h" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "buz_session";

export function parseCookie(cookieHeader: string, name: string): string | undefined {
  return cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

export function getTokenFromRequest(req: Request): TokenPayload | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  if (!token) return null;
  return verifyToken(decodeURIComponent(token));
}

export function requireAuth(req: Request, allowedRoles?: Role[]): TokenPayload {
  const payload = getTokenFromRequest(req);
  if (!payload) throw new Error("Unauthorized");
  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    throw new Error("Forbidden");
  }
  return payload;
}
