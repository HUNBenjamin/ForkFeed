import { NextResponse } from "next/server";
import {
  extractBearerToken,
  verifyToken,
  isTokenDenylisted,
  denylistToken,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: "Missing or malformed Authorization header." },
      { status: 401 },
    );
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 },
    );
  }

  if (await isTokenDenylisted(payload.jti)) {
    return NextResponse.json(
      { error: "Token has already been invalidated." },
      { status: 401 },
    );
  }

  await denylistToken(payload.jti, new Date(payload.exp * 1000));

  return NextResponse.json(
    { message: "Successfully logged out." },
    { status: 200 },
  );
}
