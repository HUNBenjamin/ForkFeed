import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ commentId: string }> };

function parseCommentId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

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
    select: { user_id: true, is_deleted: true },
  });

  if (!existing || existing.is_deleted) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  if (existing.user_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json({ error: "Not authorized to edit this comment." }, { status: 403 });
  }

  let payload: { content?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const content = payload.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }

  const comment = await prisma.comment.update({
    where: { id },
    data: { content, updated_at: new Date() },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      user: {
        select: {
          id: true,
          username: true,
          profile_image_url: true,
        },
      },
    },
  });

  return NextResponse.json({ comment }, { status: 200 });
}
