import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

  const existing = await prisma.tag.findUnique({ where: { name } });

  if (existing) {
    return NextResponse.json({ error: "A tag with that name already exists." }, { status: 409 });
  }

  const last = await prisma.tag.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const id = (last?.id ?? 0) + 1;

  const tag = await prisma.tag.create({
    data: { id, name },
    select: {
      id: true,
      name: true,
      created_at: true,
    },
  });

  return NextResponse.json({ tag }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";

  const where = query ? { name: { contains: query, mode: "insensitive" as const } } : undefined;

  const tags = await prisma.tag.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      created_at: true,
    },
  });

  return NextResponse.json({ tags }, { status: 200 });
}
