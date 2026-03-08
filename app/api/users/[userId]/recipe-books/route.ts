import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ userId: string }> };

function parseUserId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { userId } = await params;
  const id = parseUserId(userId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { is_active: true },
  });

  if (!user || !user.is_active) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where = { owner_id: id, is_public: true };

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
