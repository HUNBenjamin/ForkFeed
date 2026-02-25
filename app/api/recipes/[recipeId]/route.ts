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
      description: true,
      preparation_time: true,
      difficulty: true,
      average_rating: true,
      rating_count: true,
      created_at: true,
      updated_at: true,
      is_deleted: true,
      author: {
        select: {
          id: true,
          username: true,
          profile_image_url: true,
        },
      },
      ingredients: {
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
        },
      },
      steps: {
        orderBy: { step_number: "asc" },
        select: {
          id: true,
          step_number: true,
          description: true,
        },
      },
      recipe_categories: {
        select: {
          category: {
            select: { id: true, name: true },
          },
        },
      },
      recipe_tags: {
        select: {
          tag: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { is_deleted, recipe_categories, recipe_tags, ...rest } = recipe;

  return NextResponse.json(
    {
      recipe: {
        ...rest,
        categories: recipe_categories.map((rc) => rc.category),
        tags: recipe_tags.map((rt) => rt.tag),
      },
    },
    { status: 200 },
  );
}
