import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ recipeId: string }> };

function parseRecipeId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
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
    select: { is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const rating = await prisma.rating.findUnique({
    where: { recipe_id_user_id: { recipe_id: rId, user_id: auth.sub } },
    select: {
      id: true,
      rating: true,
      created_at: true,
    },
  });

  if (!rating) {
    return NextResponse.json({ rating: null }, { status: 200 });
  }

  return NextResponse.json({ rating }, { status: 200 });
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
    select: { is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  let payload: { rating?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const value = payload.rating;

  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 5) {
    return NextResponse.json(
      { error: "rating must be an integer between 1 and 5." },
      { status: 400 },
    );
  }

  const ratingValue = value as number;

  const existing = await prisma.rating.findUnique({
    where: { recipe_id_user_id: { recipe_id: rId, user_id: auth.sub } },
    select: { id: true },
  });

  let newId: number | undefined;
  if (!existing) {
    const last = await prisma.rating.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
    newId = (last?.id ?? 0) + 1;
  }

  const rating = existing
    ? await prisma.rating.update({
        where: { recipe_id_user_id: { recipe_id: rId, user_id: auth.sub } },
        data: { rating: ratingValue },
        select: { id: true, rating: true, created_at: true },
      })
    : await prisma.rating.create({
        data: { id: newId!, recipe_id: rId, user_id: auth.sub, rating: ratingValue },
        select: { id: true, rating: true, created_at: true },
      });

  // Recalculate and persist denormalized stats on the recipe.
  const agg = await prisma.rating.aggregate({
    where: { recipe_id: rId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.recipe.update({
    where: { id: rId },
    data: {
      average_rating: agg._avg.rating ?? 0,
      rating_count: agg._count.rating,
    },
  });

  return NextResponse.json({ rating }, { status: 200 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
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
    select: { is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const existing = await prisma.rating.findUnique({
    where: { recipe_id_user_id: { recipe_id: rId, user_id: auth.sub } },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "You have not rated this recipe." }, { status: 404 });
  }

  await prisma.rating.delete({
    where: { recipe_id_user_id: { recipe_id: rId, user_id: auth.sub } },
  });

  // Recalculate and persist denormalized stats on the recipe.
  const agg = await prisma.rating.aggregate({
    where: { recipe_id: rId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.recipe.update({
    where: { id: rId },
    data: {
      average_rating: agg._avg.rating ?? 0,
      rating_count: agg._count.rating,
    },
  });

  return NextResponse.json({ message: "Rating deleted successfully." }, { status: 200 });
}
