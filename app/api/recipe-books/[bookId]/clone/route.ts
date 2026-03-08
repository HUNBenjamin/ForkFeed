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

  const source = await prisma.recipeBook.findUnique({
    where: { id },
    select: {
      name: true,
      description: true,
      is_public: true,
      owner_id: true,
      recipe_book_recipes: {
        select: { recipe_id: true },
      },
    },
  });

  if (!source) {
    return NextResponse.json({ error: "Recipe book not found." }, { status: 404 });
  }

  if (!source.is_public && source.owner_id !== auth.sub) {
    return NextResponse.json({ error: "Recipe book not found." }, { status: 404 });
  }

  if (source.owner_id === auth.sub) {
    return NextResponse.json({ error: "You cannot clone your own recipe book." }, { status: 400 });
  }

  const last = await prisma.recipeBook.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const newId = (last?.id ?? 0) + 1;

  const cloned = await prisma.recipeBook.create({
    data: {
      id: newId,
      name: `${source.name} (copy)`,
      description: source.description,
      is_public: false,
      owner_id: auth.sub,
      recipe_book_recipes: {
        create: source.recipe_book_recipes.map((r) => ({ recipe_id: r.recipe_id })),
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      is_public: true,
      created_at: true,
      updated_at: true,
      owner: {
        select: {
          id: true,
          username: true,
          profile_image_url: true,
        },
      },
      _count: {
        select: { recipe_book_recipes: true },
      },
    },
  });

  const { _count, ...rest } = cloned;

  return NextResponse.json(
    { recipe_book: { ...rest, recipe_count: _count.recipe_book_recipes } },
    { status: 201 },
  );
}
