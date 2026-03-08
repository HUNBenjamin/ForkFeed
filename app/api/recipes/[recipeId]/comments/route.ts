import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ recipeId: string }> };

function parseRecipeId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { recipeId } = await params;
  const rId = parseRecipeId(recipeId);

  if (rId === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: rId },
    select: { is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const where = { recipe_id: rId, is_deleted: false };

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { created_at: order },
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            username: true,
            profile_image_url: true,
          },
        },
      },
    }),
    prisma.comment.count({ where }),
  ]);

  return NextResponse.json(
    {
      comments,
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
