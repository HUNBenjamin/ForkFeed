import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ bookId: string }> };

function parseBookId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { bookId } = await params;
  const id = parseBookId(bookId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe book ID." }, { status: 400 });
  }

  const recipeBook = await prisma.recipeBook.findUnique({
    where: { id },
    select: { owner_id: true },
  });

  if (!recipeBook) {
    return NextResponse.json({ error: "Recipe book not found." }, { status: 404 });
  }

  if (recipeBook.owner_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json({ error: "Not authorized to modify this recipe book." }, { status: 403 });
  }

  let payload: { recipeId?: unknown; recipeIds?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  // Normalise both single and bulk input into one array.
  let recipeIds: number[];

  if (Array.isArray(payload.recipeIds)) {
    recipeIds = payload.recipeIds as number[];
  } else if (payload.recipeId !== undefined) {
    recipeIds = [payload.recipeId as number];
  } else {
    return NextResponse.json(
      { error: "Provide recipeId (single) or recipeIds (array)." },
      { status: 400 },
    );
  }

  if (recipeIds.length === 0) {
    return NextResponse.json({ error: "recipeIds must not be empty." }, { status: 400 });
  }

  if (recipeIds.some((r) => !Number.isInteger(r))) {
    return NextResponse.json({ error: "All recipe IDs must be integers." }, { status: 400 });
  }

  // Verify all recipes exist and are not deleted.
  const validRecipes = await prisma.recipe.count({
    where: { id: { in: recipeIds }, is_deleted: false },
  });

  if (validRecipes !== recipeIds.length) {
    return NextResponse.json(
      { error: "One or more recipe IDs are invalid or deleted." },
      { status: 400 },
    );
  }

  // Find which are already in the book to skip them gracefully.
  const alreadyIn = await prisma.recipeBookRecipe.findMany({
    where: { recipe_book_id: id, recipe_id: { in: recipeIds } },
    select: { recipe_id: true },
  });

  const alreadyInSet = new Set(alreadyIn.map((r) => r.recipe_id));
  const toAdd = recipeIds.filter((rId) => !alreadyInSet.has(rId));

  if (toAdd.length > 0) {
    await prisma.recipeBookRecipe.createMany({
      data: toAdd.map((rId) => ({ recipe_book_id: id, recipe_id: rId })),
    });
  }

  return NextResponse.json(
    {
      added: toAdd.length,
      skipped: recipeIds.length - toAdd.length,
    },
    { status: 200 },
  );
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { bookId } = await params;
  const id = parseBookId(bookId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe book ID." }, { status: 400 });
  }

  const recipeBook = await prisma.recipeBook.findUnique({
    where: { id },
    select: { is_public: true, owner_id: true },
  });

  if (!recipeBook) {
    return NextResponse.json({ error: "Recipe book not found." }, { status: 404 });
  }

  // Private books are only visible to their owner.
  if (!recipeBook.is_public) {
    const auth = await authenticateRequest(request);
    if ("error" in auth || auth.sub !== recipeBook.owner_id) {
      return NextResponse.json({ error: "Recipe book not found." }, { status: 404 });
    }
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where = { recipe_book_id: id };

  const [entries, total] = await Promise.all([
    prisma.recipeBookRecipe.findMany({
      where,
      orderBy: { id: "asc" },
      skip,
      take: limit,
      select: {
        recipe: {
          select: {
            id: true,
            title: true,
            description: true,
            image_url: true,
            preparation_time: true,
            difficulty: true,
            average_rating: true,
            rating_count: true,
            created_at: true,
            author: {
              select: {
                id: true,
                username: true,
                profile_image_url: true,
              },
            },
          },
        },
      },
    }),
    prisma.recipeBookRecipe.count({ where }),
  ]);

  return NextResponse.json(
    {
      recipes: entries.map((e) => e.recipe),
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
