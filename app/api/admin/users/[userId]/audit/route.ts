import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userId } = await params;
  const id = Number(userId);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const [reportsFiled, reportsReceived, reviewedReports] = await Promise.all([
    prisma.report.findMany({
      where: { reported_by: id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        target_type: true,
        target_id: true,
        reason: true,
        status: true,
        created_at: true,
      },
    }),
    prisma.report.findMany({
      where: { target_type: "user", target_id: id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        reported_by: true,
        reason: true,
        status: true,
        created_at: true,
        reviewed_at: true,
      },
    }),
    prisma.report.findMany({
      where: { reviewed_by: id },
      orderBy: { reviewed_at: "desc" },
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
  ]);

  return NextResponse.json(
    {
      user_id: id,
      username: user.username,
      audit: {
        reports_filed: reportsFiled,
        reports_received: reportsReceived,
        reports_reviewed: reviewedReports,
      },
    },
    { status: 200 },
  );
}
