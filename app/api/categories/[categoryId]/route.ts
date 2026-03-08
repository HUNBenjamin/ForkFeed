import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ categoryId: string }> };

function parseCategoryId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { categoryId } = await params;
  const id = parseCategoryId(categoryId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid category ID." }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      _count: {
        select: {
          recipe_categories: true,
        },
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        created_at: category.created_at,
        recipe_count: category._count.recipe_categories,
      },
    },
    { status: 200 },
  );
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { categoryId } = await params;
  const id = parseCategoryId(categoryId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid category ID." }, { status: 400 });
  }

  let payload: { name?: string; description?: string | null };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
    }
    const conflict = await prisma.category.findUnique({ where: { name } });
    if (conflict && conflict.id !== id) {
      return NextResponse.json(
        { error: "A category with that name already exists." },
        { status: 409 },
      );
    }
    data.name = name;
  }

  if (payload.description !== undefined) {
    data.description = payload.description?.trim() ?? null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields provided to update." }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  const category = await prisma.category.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
    },
  });

  return NextResponse.json({ category }, { status: 200 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { categoryId } = await params;
  const id = parseCategoryId(categoryId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid category ID." }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  // Remove all recipe↔category links first, then hard-delete the category.
  await prisma.recipeCategory.deleteMany({ where: { category_id: id } });
  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ message: "Category deleted successfully." }, { status: 200 });
}
