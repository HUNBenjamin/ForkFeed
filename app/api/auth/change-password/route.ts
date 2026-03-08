import { NextRequest, NextResponse } from "next/server";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

const PASSWORD_MIN_LENGTH = 8;

function verifyPassword(password: string, storedHash: string): boolean {
  const [, salt, hash] = storedHash.split("$");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let payload: { old_password?: string; new_password?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const old_password = payload.old_password ?? "";
  const new_password = payload.new_password ?? "";

  if (!old_password || !new_password) {
    return NextResponse.json(
      { error: "old_password and new_password are required." },
      { status: 400 },
    );
  }

  if (new_password.length < PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      { error: `new_password must be at least ${PASSWORD_MIN_LENGTH} characters.` },
      { status: 400 },
    );
  }

  if (old_password === new_password) {
    return NextResponse.json(
      { error: "new_password must differ from the current password." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: { password_hash: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!verifyPassword(old_password, user.password_hash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.sub },
    data: { password_hash: hashPassword(new_password), updated_at: new Date() },
  });

  return NextResponse.json({ message: "Password changed successfully." }, { status: 200 });
}
