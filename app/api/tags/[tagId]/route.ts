import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { tagId } = await params;
  const id = parseTagId(tagId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid tag ID." }, { status: 400 });
  }

  let payload: { name?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const name = payload.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const conflict = await prisma.tag.findUnique({ where: { name } });
  if (conflict && conflict.id !== id) {
    return NextResponse.json({ error: "A tag with that name already exists." }, { status: 409 });
  }

  const existing = await prisma.tag.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    return NextResponse.json({ error: "Tag not found." }, { status: 404 });
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: { name },
    select: {
      id: true,
      name: true,
      created_at: true,
    },
  });

  return NextResponse.json({ tag }, { status: 200 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { tagId } = await params;
  const id = parseTagId(tagId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid tag ID." }, { status: 400 });
  }

  const existing = await prisma.tag.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    return NextResponse.json({ error: "Tag not found." }, { status: 404 });
  }

  // Remove all recipe↔tag links first, then hard-delete the tag.
  await prisma.recipeTag.deleteMany({ where: { tag_id: id } });
  await prisma.tag.delete({ where: { id } });

  return NextResponse.json({ message: "Tag deleted successfully." }, { status: 200 });
}
