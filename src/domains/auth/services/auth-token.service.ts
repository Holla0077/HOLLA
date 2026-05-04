import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "holla_super_secret_key_change_this";

export type SessionTokenPayload = {
  id: string;
  email?: string;
  impersonated?: boolean;
};

export class AuthTokenService {
  static sign(payload: SessionTokenPayload): string {
    return jwt.sign(payload, SECRET, { expiresIn: "7d" });
  }

  static verify(token: string): SessionTokenPayload | null {
    try {
      return jwt.verify(token, SECRET) as SessionTokenPayload;
    } catch {
      return null;
    }
  }
}

// Keep standalone functions for backward compatibility
export function signToken(payload: SessionTokenPayload) {
  return AuthTokenService.sign(payload);
}

export function verifyToken(token: string): SessionTokenPayload | null {
  return AuthTokenService.verify(token);
}