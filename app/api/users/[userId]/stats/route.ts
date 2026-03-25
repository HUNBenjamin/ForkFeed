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
    select: { is_active: true },
  });

  if (!user || !user.is_active) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const [recipesCount, recipeBooksCount, avgRating] = await Promise.all([
    prisma.recipe.count({ where: { author_id: id, is_deleted: false } }),
    prisma.recipeBook.count({ where: { owner_id: id, is_public: true } }),
    prisma.recipe.aggregate({
      where: { author_id: id, is_deleted: false },
      _avg: { average_rating: true },
    }),
  ]);

  return NextResponse.json(
    {
      stats: {
        recipes_count: recipesCount,
        recipe_books_count: recipeBooksCount,
        average_recipe_rating: avgRating._avg.average_rating ?? 0,
      },
    },
    { status: 200 },
  );
}
