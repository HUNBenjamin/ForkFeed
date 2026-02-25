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
