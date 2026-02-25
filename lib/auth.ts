import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";
const JWT_EXPIRES_IN = "1d";

export interface JwtPayload {
  sub: number;
  username: string;
  role: string;
  jti: string;
  iat: number;
  exp: number;
}

export function signToken(user: { id: number; username: string; role: string }): string {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti: randomUUID(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function isTokenDenylisted(jti: string): Promise<boolean> {
  const entry = await prisma.denylistedToken.findUnique({ where: { jti } });
  return entry !== null;
}

export async function denylistToken(jti: string, expiresAt: Date): Promise<void> {
  await prisma.denylistedToken.create({
    data: { jti, expires_at: expiresAt },
  });
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
