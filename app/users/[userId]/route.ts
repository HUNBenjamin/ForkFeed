import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const id = Number(userId);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      profile_image_url: true,
      bio: true,
      created_at: true,
      is_active: true,
    },
  });

  if (!user || !user.is_active) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        username: user.username,
        profile_image_url: user.profile_image_url,
        bio: user.bio,
        created_at: user.created_at,
      },
    },
    { status: 200 },
  );
}
