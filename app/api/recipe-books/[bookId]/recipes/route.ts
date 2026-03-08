import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ bookId: string }> };

function parseBookId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
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
