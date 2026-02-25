import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const role = searchParams.get("role")?.trim() ?? "";
  const isActiveParam = searchParams.get("is_active");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [
      { username: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (isActiveParam !== null && isActiveParam !== "") {
    where.is_active = isActiveParam === "true";
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
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
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json(
    {
      users,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    },
    { status: 200 },
  );
}
