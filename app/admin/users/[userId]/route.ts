import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userId } = await params;
  const id = Number(userId);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }

  let payload: { role?: string; is_active?: boolean };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const allowedRoles = ["user", "admin"];
  const data: Record<string, unknown> = { updated_at: new Date() };

  if (payload.role !== undefined) {
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed: ${allowedRoles.join(", ")}` },
        { status: 400 },
      );
    }
    data.role = payload.role;
  }

  if (payload.is_active !== undefined) {
    if (typeof payload.is_active !== "boolean") {
      return NextResponse.json({ error: "is_active must be a boolean." }, { status: 400 });
    }

    if (id === auth.sub && payload.is_active === false) {
      return NextResponse.json({ error: "Cannot deactivate your own account." }, { status: 400 });
    }

    data.is_active = payload.is_active;
  }

  if (Object.keys(data).length === 1) {
    return NextResponse.json({ error: "No valid fields provided to update." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      is_active: true,
      updated_at: true,
    },
  });

  return NextResponse.json({ user }, { status: 200 });
}
