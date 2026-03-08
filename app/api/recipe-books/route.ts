import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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

  if (scope === "mine") {
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
