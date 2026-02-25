import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const query = searchParams.get("query")?.trim() ?? "";
  const difficulty = searchParams.get("difficulty")?.trim() ?? "";
  const sortBy = searchParams.get("sort") ?? "created_at";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const where: Record<string, unknown> = { is_deleted: false };

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  if (difficulty) {
    where.difficulty = difficulty;
  }

  const allowedSortFields: Record<string, string> = {
    created_at: "created_at",
    average_rating: "average_rating",
    preparation_time: "preparation_time",
    rating_count: "rating_count",
  };

  const orderByField = allowedSortFields[sortBy] ?? "created_at";

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy: { [orderByField]: order },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
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
    }),
    prisma.recipe.count({ where }),
  ]);

  return NextResponse.json(
    {
      recipes,
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
