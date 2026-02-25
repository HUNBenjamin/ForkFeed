import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ recipeId: string }> };

function parseRecipeId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId } = await params;
  const rId = parseRecipeId(recipeId);

  if (rId === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
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

  let payload: { order: number[] };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!Array.isArray(payload.order) || payload.order.length === 0) {
    return NextResponse.json(
      { error: "order must be a non-empty array of step IDs." },
      { status: 400 },
    );
  }

  const existingSteps = await prisma.step.findMany({
    where: { recipe_id: rId },
    select: { id: true },
  });

  const existingIds = new Set(existingSteps.map((s) => s.id));

  for (const stepId of payload.order) {
    if (!existingIds.has(stepId)) {
      return NextResponse.json(
        { error: `Step ID ${stepId} does not belong to this recipe.` },
        { status: 400 },
      );
    }
  }

  if (payload.order.length !== existingIds.size) {
    return NextResponse.json(
      { error: "order array must contain all step IDs of the recipe." },
      { status: 400 },
    );
  }

  await Promise.all(
    payload.order.map((stepId, index) =>
      prisma.step.update({
        where: { id: stepId },
        data: { step_number: index + 1 },
      }),
    ),
  );

  const steps = await prisma.step.findMany({
    where: { recipe_id: rId },
    orderBy: { step_number: "asc" },
    select: { id: true, step_number: true, description: true },
  });

  return NextResponse.json({ steps }, { status: 200 });
}
