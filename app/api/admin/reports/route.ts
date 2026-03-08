import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED_STATUSES = ["pending", "accepted", "rejected"];
const ALLOWED_TARGET_TYPES = ["recipe", "comment"];

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const statusParam = searchParams.get("status")?.trim();
  const targetTypeParam = searchParams.get("target_type")?.trim();
  const reportedByParam = searchParams.get("reported_by");

  const where: Record<string, unknown> = {};

  if (statusParam) {
    if (!ALLOWED_STATUSES.includes(statusParam)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}.` },
        { status: 400 },
      );
    }
    where.status = statusParam;
  }

  if (targetTypeParam) {
    if (!ALLOWED_TARGET_TYPES.includes(targetTypeParam)) {
      return NextResponse.json(
        { error: `target_type must be one of: ${ALLOWED_TARGET_TYPES.join(", ")}.` },
        { status: 400 },
      );
    }
    where.target_type = targetTypeParam;
  }

  if (reportedByParam !== null) {
    const reportedById = Number(reportedByParam);
    if (!Number.isInteger(reportedById) || Number.isNaN(reportedById)) {
      return NextResponse.json({ error: "reported_by must be an integer." }, { status: 400 });
    }
    where.reported_by = reportedById;
  }

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
        reporter: {
          select: { id: true, username: true },
        },
        reviewer: {
          select: { id: true, username: true },
        },
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
