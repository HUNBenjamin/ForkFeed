import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
