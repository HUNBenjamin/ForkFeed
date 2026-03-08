import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ bookId: string; recipeId: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { bookId, recipeId } = await params;
  const bId = parseId(bookId);
  const rId = parseId(recipeId);

  if (bId === null) {
    return NextResponse.json({ error: "Invalid recipe book ID." }, { status: 400 });
  }

  if (rId === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const recipeBook = await prisma.recipeBook.findUnique({
    where: { id: bId },
    select: { owner_id: true },
  });

  if (!recipeBook) {
    return NextResponse.json({ error: "Recipe book not found." }, { status: 404 });
  }

  if (recipeBook.owner_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json(
      { error: "Not authorized to modify this recipe book." },
      { status: 403 },
    );
  }

  const entry = await prisma.recipeBookRecipe.findUnique({
    where: { recipe_book_id_recipe_id: { recipe_book_id: bId, recipe_id: rId } },
    select: { id: true },
  });

  if (!entry) {
    return NextResponse.json({ error: "Recipe is not in this recipe book." }, { status: 404 });
  }

  await prisma.recipeBookRecipe.delete({
    where: { recipe_book_id_recipe_id: { recipe_book_id: bId, recipe_id: rId } },
  });

  return NextResponse.json({ message: "Recipe removed from recipe book." }, { status: 200 });
}
