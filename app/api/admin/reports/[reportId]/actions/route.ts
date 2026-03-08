import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ reportId: string }> };

const ALLOWED_ACTIONS = ["delete_target", "warn_user"] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { reportId } = await params;
  const id = Number(reportId);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid report ID." }, { status: 400 });
  }

  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, target_type: true, target_id: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  let payload: { action?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const action = payload.action?.trim() as Action | undefined;

  if (!action) {
    return NextResponse.json({ error: "action is required." }, { status: 400 });
  }

  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${ALLOWED_ACTIONS.join(", ")}.` },
      { status: 400 },
    );
  }

  let actionResult: Record<string, unknown> = {};

  if (action === "delete_target") {
    if (report.target_type === "comment") {
      const result = await prisma.comment.updateMany({
        where: { id: report.target_id, is_deleted: false },
        data: { is_deleted: true, updated_at: new Date() },
      });

      if (result.count === 0) {
        return NextResponse.json(
          { error: "Target comment not found or already deleted." },
          { status: 404 },
        );
      }

      actionResult = { deleted: "comment", comment_id: report.target_id };
    } else if (report.target_type === "recipe") {
      const result = await prisma.recipe.updateMany({
        where: { id: report.target_id, is_deleted: false },
        data: { is_deleted: true, updated_at: new Date() },
      });

      if (result.count === 0) {
        return NextResponse.json(
          { error: "Target recipe not found or already deleted." },
          { status: 404 },
        );
      }

      actionResult = { deleted: "recipe", recipe_id: report.target_id };
    } else {
      return NextResponse.json(
        {
          error: `delete_target is not supported for target_type "${report.target_type}".`,
        },
        { status: 422 },
      );
    }
  } else if (action === "warn_user") {
    // Placeholder — User model has no warning field yet.
    // The report is accepted and the action is acknowledged.
    actionResult = { warned: true };
  }

  const updatedReport = await prisma.report.update({
    where: { id },
    data: {
      status: "accepted",
      reviewed_by: auth.sub,
      reviewed_at: new Date(),
    },
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

  return NextResponse.json({ report: updatedReport, action: actionResult }, { status: 200 });
}
