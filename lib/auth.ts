import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET || "holla_super_secret_key_change_this";

export type SessionTokenPayload = {
  id: string;
  email?: string;
  impersonated?: boolean;
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
