import { NextResponse } from "next/server";
import { scryptSync, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

function verifyPassword(password: string, storedHash: string): boolean {
  const [, salt, hash] = storedHash.split("$");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

export async function POST(request: Request) {
  let payload: { login?: string; email?: string; username?: string; password?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  // Accept "login", "email", or "username" as the identifier field
  const identifier = (payload.login ?? payload.email ?? payload.username ?? "").trim();
  const password = payload.password ?? "";

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Login identifier and password are required." },
      { status: 400 },
    );
  }

  const normalizedIdentifier = identifier.toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedIdentifier },
        { username: identifier },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
      password_hash: true,
      role: true,
      is_active: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 },
    );
  }

  if (!user.is_active) {
    return NextResponse.json(
      { error: "Account is deactivated." },
      { status: 403 },
    );
  }

  if (!verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 },
    );
  }

  // Update last_login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { last_login: new Date() },
  });

  return NextResponse.json(
    {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
    { status: 200 },
  );
}
