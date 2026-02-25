import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ recipeId: string; stepId: string }>;
};

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId, stepId } = await params;
  const rId = parseId(recipeId);
  const sId = parseId(stepId);

  if (rId === null || sId === null) {
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: rId },
    select: { author_id: true, is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (recipe.author_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json({ error: "Not authorized to modify this recipe." }, { status: 403 });
  }

  const existing = await prisma.step.findFirst({
    where: { id: sId, recipe_id: rId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Step not found." }, { status: 404 });
  }

  let payload: { step_number?: number; description?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (payload.step_number !== undefined) {
    if (!Number.isInteger(payload.step_number) || payload.step_number <= 0) {
      return NextResponse.json(
        { error: "step_number must be a positive integer." },
        { status: 400 },
      );
    }
    data.step_number = payload.step_number;
  }

  if (payload.description !== undefined) {
    const trimmed = payload.description.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Description cannot be empty." }, { status: 400 });
    }
    data.description = trimmed;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields provided to update." }, { status: 400 });
  }

  const step = await prisma.step.update({
    where: { id: sId },
    data,
    select: { id: true, step_number: true, description: true },
  });

  return NextResponse.json({ step }, { status: 200 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId, stepId } = await params;
  const rId = parseId(recipeId);
  const sId = parseId(stepId);

  if (rId === null || sId === null) {
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: rId },
    select: { author_id: true, is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (recipe.author_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json({ error: "Not authorized to modify this recipe." }, { status: 403 });
  }

  const existing = await prisma.step.findFirst({
    where: { id: sId, recipe_id: rId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Step not found." }, { status: 404 });
  }

  await prisma.step.delete({ where: { id: sId } });

  return NextResponse.json({ message: "Step deleted successfully." }, { status: 200 });
}
