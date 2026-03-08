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

  const favorite = await prisma.favorite.findUnique({
    where: { user_id_recipe_id: { user_id: auth.sub, recipe_id: rId } },
    select: { id: true, created_at: true },
  });

  return NextResponse.json(
    { favorited: favorite !== null, favorite: favorite ?? null },
    { status: 200 },
  );
}

export async function POST(request: NextRequest, { params }: RouteContext) {
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

  const existing = await prisma.favorite.findUnique({
    where: { user_id_recipe_id: { user_id: auth.sub, recipe_id: rId } },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "Recipe is already in your favorites." }, { status: 409 });
  }

  const last = await prisma.favorite.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const id = (last?.id ?? 0) + 1;

  const favorite = await prisma.favorite.create({
    data: { id, user_id: auth.sub, recipe_id: rId },
    select: {
      id: true,
      created_at: true,
      recipe: {
        select: {
          id: true,
          title: true,
          image_url: true,
          difficulty: true,
          average_rating: true,
        },
      },
    },
  });

  return NextResponse.json({ favorite }, { status: 201 });
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

  const existing = await prisma.favorite.findUnique({
    where: { user_id_recipe_id: { user_id: auth.sub, recipe_id: rId } },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Recipe is not in your favorites." }, { status: 404 });
  }

  await prisma.favorite.delete({
    where: { user_id_recipe_id: { user_id: auth.sub, recipe_id: rId } },
  });

  return NextResponse.json({ message: "Recipe removed from favorites." }, { status: 200 });
}
