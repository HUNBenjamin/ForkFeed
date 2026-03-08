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

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { bookId } = await params;
  const id = parseBookId(bookId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe book ID." }, { status: 400 });
  }

  const existing = await prisma.recipeBook.findUnique({
    where: { id },
    select: { owner_id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Recipe book not found." }, { status: 404 });
  }

  if (existing.owner_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json(
      { error: "Not authorized to edit this recipe book." },
      { status: 403 },
    );
  }

  let payload: { name?: string; description?: string | null; is_public?: boolean };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const data: Record<string, unknown> = { updated_at: new Date() };

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
    }
    data.name = name;
  }

  if (payload.description !== undefined) {
    data.description = payload.description?.trim() ?? null;
  }

  if (payload.is_public !== undefined) {
    if (typeof payload.is_public !== "boolean") {
      return NextResponse.json({ error: "is_public must be a boolean." }, { status: 400 });
    }
    data.is_public = payload.is_public;
  }

  if (Object.keys(data).length === 1) {
    return NextResponse.json({ error: "No valid fields provided to update." }, { status: 400 });
  }

  const recipeBook = await prisma.recipeBook.update({
    where: { id },
    data,
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

  return NextResponse.json({ recipe_book: recipeBook }, { status: 200 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { bookId } = await params;
  const id = parseBookId(bookId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe book ID." }, { status: 400 });
  }

  const existing = await prisma.recipeBook.findUnique({
    where: { id },
    select: { owner_id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Recipe book not found." }, { status: 404 });
  }

  if (existing.owner_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json(
      { error: "Not authorized to delete this recipe book." },
      { status: 403 },
    );
  }

  // Remove all recipe entries first, then delete the book.
  await prisma.recipeBookRecipe.deleteMany({ where: { recipe_book_id: id } });
  await prisma.recipeBook.delete({ where: { id } });

  return NextResponse.json({ message: "Recipe book deleted successfully." }, { status: 200 });
}
