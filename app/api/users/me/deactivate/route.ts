import { NextResponse } from "next/server";
import { scryptSync, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

function verifyPassword(password: string, storedHash: string): boolean {
  const [, salt, hash] = storedHash.split("$");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.password || typeof body.password !== "string") {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: { is_active: true, password_hash: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!user.is_active) {
    return NextResponse.json({ error: "Account is already deactivated." }, { status: 400 });
  }

  if (!verifyPassword(body.password, user.password_hash)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: auth.sub },
    data: { is_active: false, updated_at: new Date() },
  });

  return NextResponse.json({ message: "Account deactivated successfully." }, { status: 200 });
}
