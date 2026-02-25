import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "crypto";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const PASSWORD_MIN_LENGTH = 8;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function validatePassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH;
}

async function getNextUserId() {
  const lastUser = await prisma.user.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  return (lastUser?.id ?? 0) + 1;
}

export async function POST(request: Request) {
  let payload: { username?: string; email?: string; password?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const username = payload.username?.trim();
  const email = payload.email ? normalizeEmail(payload.email) : undefined;
  const password = payload.password ?? "";

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: "Username, email and password are required." },
      { status: 400 }
    );
  }

  if (!validatePassword(password)) {
    return NextResponse.json(
      { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Username or email already in use." },
      { status: 409 }
    );
  }

  const userId = await getNextUserId();
  const password_hash = hashPassword(password);

  const user = await prisma.user.create({
    data: {
      id: userId,
      username,
      email,
      password_hash,
      role: "user",
      is_active: true,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
