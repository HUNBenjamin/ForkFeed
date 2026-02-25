import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ recipeId: string }> };

function parseRecipeId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId } = await params;
  const rId = parseRecipeId(recipeId);

  if (rId === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: rId },
    select: { author_id: true, is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (recipe.author_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json({ error: "Not authorized to modify this recipe." }, { status: 403 });
  }

  let payload: { categoryIds?: number[] };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!Array.isArray(payload.categoryIds)) {
    return NextResponse.json(
      { error: "categoryIds must be an array of category IDs." },
      { status: 400 },
    );
  }

  if (payload.categoryIds.length > 0) {
    const existing = await prisma.category.count({
      where: { id: { in: payload.categoryIds } },
    });

    if (existing !== payload.categoryIds.length) {
      return NextResponse.json({ error: "One or more category IDs are invalid." }, { status: 400 });
    }
  }

  await prisma.recipeCategory.deleteMany({ where: { recipe_id: rId } });

  if (payload.categoryIds.length > 0) {
    await prisma.recipeCategory.createMany({
      data: payload.categoryIds.map((cId) => ({ recipe_id: rId, category_id: cId })),
    });
  }

  const categories = await prisma.recipeCategory.findMany({
    where: { recipe_id: rId },
    select: { category: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ categories: categories.map((rc) => rc.category) }, { status: 200 });
}
