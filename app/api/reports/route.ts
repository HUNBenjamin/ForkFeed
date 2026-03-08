import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED_TARGET_TYPES = ["recipe", "comment"] as const;
type TargetType = (typeof ALLOWED_TARGET_TYPES)[number];

async function targetExists(type: TargetType, id: number): Promise<boolean> {
  if (type === "recipe") {
    const r = await prisma.recipe.findUnique({ where: { id }, select: { is_deleted: true } });
    return r !== null && !r.is_deleted;
  }
  const c = await prisma.comment.findUnique({ where: { id }, select: { is_deleted: true } });
  return c !== null && !c.is_deleted;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let payload: { target_type?: string; target_id?: unknown; reason?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const target_type = payload.target_type?.trim() as TargetType | undefined;
  const reason = payload.reason?.trim();

  if (!target_type || !ALLOWED_TARGET_TYPES.includes(target_type)) {
    return NextResponse.json(
      { error: `target_type must be one of: ${ALLOWED_TARGET_TYPES.join(", ")}.` },
      { status: 400 },
    );
  }

  if (!Number.isInteger(payload.target_id)) {
    return NextResponse.json({ error: "target_id must be an integer." }, { status: 400 });
  }

  const target_id = payload.target_id as number;

  if (!reason) {
    return NextResponse.json({ error: "reason is required." }, { status: 400 });
  }

  if (!(await targetExists(target_type, target_id))) {
    return NextResponse.json({ error: "Target not found." }, { status: 404 });
  }

  const last = await prisma.report.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const id = (last?.id ?? 0) + 1;

  const report = await prisma.report.create({
    data: { id, reported_by: auth.sub, target_type, target_id, reason },
    select: {
      id: true,
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      created_at: true,
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const where = { reported_by: auth.sub };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        target_type: true,
        target_id: true,
        reason: true,
        status: true,
        created_at: true,
        reviewed_at: true,
      },
    }),
    prisma.report.count({ where }),
  ]);

  return NextResponse.json(
    {
      reports,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    },
    { status: 200 },
  );
}
