import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ recipeId: string; ingredientId: string }>;
};

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId, ingredientId } = await params;
  const rId = parseId(recipeId);
  const iId = parseId(ingredientId);

  if (rId === null || iId === null) {
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
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

  const existing = await prisma.ingredient.findFirst({
    where: { id: iId, recipe_id: rId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Ingredient not found." }, { status: 404 });
  }

  let payload: { name?: string; quantity?: number | null; unit?: string | null };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }
    data.name = trimmed;
  }

  if (payload.quantity !== undefined) {
    data.quantity = payload.quantity;
  }

  if (payload.unit !== undefined) {
    data.unit = payload.unit?.trim() ?? null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields provided to update." }, { status: 400 });
  }

  const ingredient = await prisma.ingredient.update({
    where: { id: iId },
    data,
    select: { id: true, name: true, quantity: true, unit: true },
  });

  return NextResponse.json({ ingredient }, { status: 200 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId, ingredientId } = await params;
  const rId = parseId(recipeId);
  const iId = parseId(ingredientId);

  if (rId === null || iId === null) {
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
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

  const existing = await prisma.ingredient.findFirst({
    where: { id: iId, recipe_id: rId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Ingredient not found." }, { status: 404 });
  }

  await prisma.ingredient.delete({ where: { id: iId } });

  return NextResponse.json({ message: "Ingredient deleted successfully." }, { status: 200 });
}
