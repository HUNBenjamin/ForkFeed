import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ recipeId: string }> };

function parseRecipeId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

async function getNextStepId() {
  const last = await prisma.step.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  return (last?.id ?? 0) + 1;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { recipeId } = await params;
  const id = parseRecipeId(recipeId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const steps = await prisma.step.findMany({
    where: { recipe_id: id },
    orderBy: { step_number: "asc" },
    select: {
      id: true,
      step_number: true,
      description: true,
    },
  });

  return NextResponse.json({ steps }, { status: 200 });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId } = await params;
  const id = parseRecipeId(recipeId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { author_id: true, is_deleted: true },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (recipe.author_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json({ error: "Not authorized to modify this recipe." }, { status: 403 });
  }

  let payload: { step_number?: number; description?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const description = payload.description?.trim();

  if (!description) {
    return NextResponse.json({ error: "Step description is required." }, { status: 400 });
  }

  let stepNumber = payload.step_number;
  if (stepNumber === undefined) {
    const lastStep = await prisma.step.findFirst({
      where: { recipe_id: id },
      orderBy: { step_number: "desc" },
      select: { step_number: true },
    });
    stepNumber = (lastStep?.step_number ?? 0) + 1;
  }

  const stepId = await getNextStepId();

  const step = await prisma.step.create({
    data: {
      id: stepId,
      recipe_id: id,
      step_number: stepNumber,
      description,
    },
    select: {
      id: true,
      step_number: true,
      description: true,
    },
  });

  return NextResponse.json({ step }, { status: 201 });
}
