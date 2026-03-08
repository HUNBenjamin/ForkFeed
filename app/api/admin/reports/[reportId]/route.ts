import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ reportId: string }> };

function parseReportId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { reportId } = await params;
  const id = parseReportId(reportId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid report ID." }, { status: 400 });
  }

  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      created_at: true,
      reviewed_at: true,
      reporter: {
        select: { id: true, username: true, email: true },
      },
      reviewer: {
        select: { id: true, username: true },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({ report }, { status: 200 });
}
