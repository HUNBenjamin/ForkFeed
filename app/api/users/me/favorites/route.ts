import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;
  const expanded = searchParams.get("expanded") === "true";

  const where = { user_id: auth.sub };

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        created_at: true,
        recipe: expanded
          ? {
              select: {
                id: true,
                title: true,
                description: true,
                image_url: true,
                preparation_time: true,
                difficulty: true,
                average_rating: true,
                rating_count: true,
                created_at: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    profile_image_url: true,
                  },
                },
              },
            }
          : {
              select: {
                id: true,
                title: true,
                image_url: true,
                difficulty: true,
                average_rating: true,
              },
            },
      },
    }),
    prisma.favorite.count({ where }),
  ]);

  return NextResponse.json(
    {
      favorites,
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
