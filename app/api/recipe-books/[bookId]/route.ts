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
    select: {
      id: true,
      name: true,
      description: true,
      is_public: true,
      owner_id: true,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _count, owner_id, ...rest } = recipeBook;

  return NextResponse.json(
    {
      recipe_book: {
        ...rest,
        recipe_count: _count.recipe_book_recipes,
      },
    },
    { status: 200 },
  );
}
