import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  const { recipeId } = await params;
  const id = Number(recipeId);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      average_rating: true,
      rating_count: true,
      preparation_time: true,
      difficulty: true,
      is_deleted: true,
    },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      summary: {
        id: recipe.id,
        title: recipe.title,
        average_rating: recipe.average_rating,
        rating_count: recipe.rating_count,
        preparation_time: recipe.preparation_time,
        difficulty: recipe.difficulty,
      },
    },
    { status: 200 },
  );
}
