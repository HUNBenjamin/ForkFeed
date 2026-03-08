import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let payload: { name?: string; description?: string | null };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const name = payload.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const description = payload.description?.trim() ?? null;

  const existing = await prisma.category.findUnique({ where: { name } });

  if (existing) {
    return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
  }

  const last = await prisma.category.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const id = (last?.id ?? 0) + 1;

  const category = await prisma.category.create({
    data: { id, name, description },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
    },
  });

  return NextResponse.json({ categories }, { status: 200 });
}
