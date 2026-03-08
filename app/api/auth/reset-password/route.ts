import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "crypto";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const PASSWORD_MIN_LENGTH = 8;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export async function POST(request: Request) {
  let payload: { token?: string; new_password?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const token = payload.token?.trim();
  const new_password = payload.new_password ?? "";

  if (!token || !new_password) {
    return NextResponse.json({ error: "token and new_password are required." }, { status: 400 });
  }

  if (new_password.length < PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      { error: `new_password must be at least ${PASSWORD_MIN_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { user_id: true, expires_at: true, used_at: true },
  });

  if (!record || record.used_at !== null) {
    return NextResponse.json({ error: "Invalid or already used reset token." }, { status: 400 });
  }

  if (record.expires_at < new Date()) {
    return NextResponse.json({ error: "Reset token has expired." }, { status: 400 });
  }

  const password_hash = hashPassword(new_password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.user_id },
      data: { password_hash, updated_at: new Date() },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { used_at: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Password has been reset successfully." }, { status: 200 });
}
