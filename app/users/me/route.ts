import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
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

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let payload: { username?: string; profile_image_url?: string | null; bio?: string | null };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const data: Record<string, unknown> = { updated_at: new Date() };

  if (payload.username !== undefined) {
    const trimmed = payload.username.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Username cannot be empty." }, { status: 400 });
    }

    const taken = await prisma.user.findFirst({
      where: { username: trimmed, id: { not: auth.sub } },
      select: { id: true },
    });

    if (taken) {
      return NextResponse.json({ error: "Username already in use." }, { status: 409 });
    }

    data.username = trimmed;
  }

  if (payload.profile_image_url !== undefined) {
    data.profile_image_url = payload.profile_image_url;
  }

  if (payload.bio !== undefined) {
    data.bio = payload.bio;
  }

  if (Object.keys(data).length === 1) {
    return NextResponse.json({ error: "No valid fields provided to update." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: auth.sub },
    data,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      profile_image_url: true,
      bio: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      last_login: true,
    },
  });

  return NextResponse.json({ user }, { status: 200 });
}
