import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ recipeId: string }> };

function parseRecipeId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

async function getNextIngredientId() {
  const last = await prisma.ingredient.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  return (last?.id ?? 0) + 1;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { recipeId } = await params;
  const id = parseRecipeId(recipeId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const ingredients = await prisma.ingredient.findMany({
    where: { recipe_id: id },
    select: {
      id: true,
      name: true,
      quantity: true,
      unit: true,
    },
  });

  return NextResponse.json({ ingredients }, { status: 200 });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId } = await params;
  const id = parseRecipeId(recipeId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { author_id: true, is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (recipe.author_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json({ error: "Not authorized to modify this recipe." }, { status: 403 });
  }

  let payload: {
    name?: string;
    quantity?: number | null;
    unit?: string | null;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const name = payload.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Ingredient name is required." }, { status: 400 });
  }

  const ingredientId = await getNextIngredientId();

  const ingredient = await prisma.ingredient.create({
    data: {
      id: ingredientId,
      recipe_id: id,
      name,
      quantity: payload.quantity ?? null,
      unit: payload.unit?.trim() ?? null,
    },
    select: {
      id: true,
      name: true,
      quantity: true,
      unit: true,
    },
  });

  return NextResponse.json({ ingredient }, { status: 201 });
}
