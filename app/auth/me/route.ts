import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractBearerToken, verifyToken, isTokenDenylisted } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
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
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  if (await isTokenDenylisted(payload.jti)) {
    return NextResponse.json({ error: "Token has been invalidated." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      profile_image_url: true,
      bio: true,
      is_active: true,
      created_at: true,
      last_login: true,
    },
  });

  if (!user || !user.is_active) {
    return NextResponse.json({ error: "User not found or deactivated." }, { status: 404 });
  }

  return NextResponse.json({ user }, { status: 200 });
}
