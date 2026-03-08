import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, optionalAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let payload: { name?: string; description?: string | null; is_public?: boolean };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const name = payload.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  if (payload.is_public !== undefined && typeof payload.is_public !== "boolean") {
    return NextResponse.json({ error: "is_public must be a boolean." }, { status: 400 });
  }

  const description = payload.description?.trim() ?? null;
  const is_public = payload.is_public ?? false;

  const last = await prisma.recipeBook.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const id = (last?.id ?? 0) + 1;

  const recipeBook = await prisma.recipeBook.create({
    data: { id, name, description, is_public, owner_id: auth.sub },
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
    },
  });

  return NextResponse.json({ recipe_book: recipeBook }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await optionalAuth(request);

  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;
  const scope = searchParams.get("scope") ?? "all";

  type WhereClause =
    | { owner_id: number }
    | { is_public: boolean }
    | { OR: ({ owner_id: number } | { is_public: boolean })[] };

  let where: WhereClause;

  if (!auth) {
    // Guests always see only public books regardless of scope.
    where = { is_public: true };
  } else if (scope === "mine") {
    where = { owner_id: auth.sub };
  } else if (scope === "public") {
    where = { is_public: true };
  } else {
    // default / "all": own books + public books from others
    where = { OR: [{ owner_id: auth.sub }, { is_public: true }] };
  }

  const [recipeBooks, total] = await Promise.all([
    prisma.recipeBook.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
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
    }),
    prisma.recipeBook.count({ where }),
  ]);

  return NextResponse.json(
    {
      recipe_books: recipeBooks.map(({ _count, ...rb }) => ({
        ...rb,
        recipe_count: _count.recipe_book_recipes,
      })),
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
