import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

//deploy test
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ commentId: string }> };

function parseCommentId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { commentId } = await params;
  const id = parseCommentId(commentId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid comment ID." }, { status: 400 });
  }

  const existing = await prisma.comment.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  await prisma.comment.delete({ where: { id } });

  return NextResponse.json({ message: "Comment permanently deleted." }, { status: 200 });
}
