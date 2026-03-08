import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_PER_TYPE = 5;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 1) {
    return NextResponse.json(
      { recipes: [], categories: [], tags: [] },
      { status: 200 },
    );
  }

  const filter = { contains: q, mode: "insensitive" as const };

  const [recipes, categories, tags] = await Promise.all([
    prisma.recipe.findMany({
      where: { title: filter, is_deleted: false },
      select: { id: true, title: true },
      take: MAX_PER_TYPE,
      orderBy: { title: "asc" },
    }),
    prisma.category.findMany({
      where: { name: filter },
      select: { id: true, name: true },
      take: MAX_PER_TYPE,
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      where: { name: filter },
      select: { id: true, name: true },
      take: MAX_PER_TYPE,
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ recipes, categories, tags }, { status: 200 });
}
