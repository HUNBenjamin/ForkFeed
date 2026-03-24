import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const id = Number(userId);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { is_active: true },
  });

  if (!user || !user.is_active) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const commentedRecipeIds = await prisma.comment.findMany({
    where: { user_id: id, is_deleted: false },
    select: { recipe_id: true },
    distinct: ["recipe_id"],
  });

  const recipeIds = commentedRecipeIds.map((c) => c.recipe_id);

  const where = { id: { in: recipeIds }, is_deleted: false };

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy: { created_at: "desc" },
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
