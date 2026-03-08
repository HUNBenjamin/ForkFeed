import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  let payload: { email?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, is_active: true },
  });

  // Always return 200 — do not reveal whether the email exists.
  if (!user || !user.is_active) {
    return NextResponse.json(
      { message: "If that email is registered you will receive a reset link shortly." },
      { status: 200 },
    );
  }

  // Invalidate any existing unused tokens for this user.
  await prisma.passwordResetToken.updateMany({
    where: { user_id: user.id, used_at: null },
    data: { used_at: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { user_id: user.id, token, expires_at },
  });

  // In production this token would be emailed. Returned here for development/testing.
  return NextResponse.json(
    {
      message: "If that email is registered you will receive a reset link shortly.",
      // TODO: remove in production — send via email instead
      reset_token: token,
    },
    { status: 200 },
  );
}
