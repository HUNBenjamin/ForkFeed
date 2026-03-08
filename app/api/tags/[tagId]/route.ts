import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ tagId: string }> };

function parseTagId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { tagId } = await params;
  const id = parseTagId(tagId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid tag ID." }, { status: 400 });
  }

  const tag = await prisma.tag.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      created_at: true,
      _count: {
        select: {
          recipe_tags: true,
        },
      },
    },
  });

  if (!tag) {
    return NextResponse.json({ error: "Tag not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      tag: {
        id: tag.id,
        name: tag.name,
        created_at: tag.created_at,
        recipe_count: tag._count.recipe_tags,
      },
    },
    { status: 200 },
  );
}
