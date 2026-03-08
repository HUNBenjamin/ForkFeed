import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

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
