import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, optionalAuth } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ recipeId: string }> };

const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard"];

async function getNextId(model: "ingredient" | "step") {
  if (model === "ingredient") {
    const last = await prisma.ingredient.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });
    return (last?.id ?? 0) + 1;
  }
  const last = await prisma.step.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  return (last?.id ?? 0) + 1;
}

function parseRecipeId(raw: string): number | null {
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { recipeId } = await params;
  const id = parseRecipeId(recipeId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      image_url: true,
      description: true,
      preparation_time: true,
      difficulty: true,
      average_rating: true,
      rating_count: true,
      created_at: true,
      updated_at: true,
      is_deleted: true,
      author: {
        select: {
          id: true,
          username: true,
          profile_image_url: true,
        },
      },
      ingredients: {
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
        },
      },
      steps: {
        orderBy: { step_number: "asc" },
        select: {
          id: true,
          step_number: true,
          description: true,
        },
      },
      recipe_categories: {
        select: {
          category: {
            select: { id: true, name: true },
          },
        },
      },
      recipe_tags: {
        select: {
          tag: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!recipe || recipe.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { is_deleted, recipe_categories, recipe_tags, ...rest } = recipe;

  let is_favorite = false;
  let my_rating: number | null = null;

  const auth = await optionalAuth(request);

  if (auth) {
    const [fav, myRating] = await Promise.all([
      prisma.favorite.findUnique({
        where: { user_id_recipe_id: { user_id: auth.sub, recipe_id: id } },
        select: { id: true },
      }),
      prisma.rating.findUnique({
        where: { recipe_id_user_id: { recipe_id: id, user_id: auth.sub } },
        select: { rating: true },
      }),
    ]);
    is_favorite = fav !== null;
    my_rating = myRating?.rating ?? null;
  }

  return NextResponse.json(
    {
      recipe: {
        ...rest,
        categories: recipe_categories.map((rc) => rc.category),
        tags: recipe_tags.map((rt) => rt.tag),
        is_favorite,
        my_rating,
      },
    },
    { status: 200 },
  );
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId } = await params;
  const id = parseRecipeId(recipeId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const existing = await prisma.recipe.findUnique({
    where: { id },
    select: { author_id: true, is_deleted: true },
  });

  if (!existing || existing.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (existing.author_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json({ error: "Not authorized to edit this recipe." }, { status: 403 });
  }

  let payload: {
    title?: string;
    description?: string | null;
    preparation_time?: number;
    difficulty?: string;
    image_url?: string | null;
    ingredients?: { name: string; quantity?: number | null; unit?: string | null }[];
    steps?: { step_number: number; description: string }[];
    category_ids?: number[];
    tag_ids?: number[];
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const data: Record<string, unknown> = { updated_at: new Date() };

  if (payload.title !== undefined) {
    const trimmed = payload.title.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
    }
    data.title = trimmed;
  }

  if (payload.description !== undefined) {
    data.description = payload.description?.trim() ?? null;
  }

  if (payload.preparation_time !== undefined) {
    if (payload.preparation_time <= 0 || !Number.isInteger(payload.preparation_time)) {
      return NextResponse.json(
        { error: "preparation_time must be a positive integer." },
        { status: 400 },
      );
    }
    data.preparation_time = payload.preparation_time;
  }

  if (payload.difficulty !== undefined) {
    if (!ALLOWED_DIFFICULTIES.includes(payload.difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty. Allowed: ${ALLOWED_DIFFICULTIES.join(", ")}` },
        { status: 400 },
      );
    }
    data.difficulty = payload.difficulty;
  }

  if ("image_url" in payload) {
    data.image_url = payload.image_url ?? null;
  }

  if (payload.ingredients !== undefined) {
    await prisma.ingredient.deleteMany({ where: { recipe_id: id } });
    let nextIngId = await getNextId("ingredient");
    data.ingredients = {
      create: payload.ingredients.map((ing) => ({
        id: nextIngId++,
        name: ing.name.trim(),
        quantity: ing.quantity ?? null,
        unit: ing.unit?.trim() ?? null,
      })),
    };
  }

  if (payload.steps !== undefined) {
    await prisma.step.deleteMany({ where: { recipe_id: id } });
    let nextStepId = await getNextId("step");
    data.steps = {
      create: payload.steps.map((s, index) => ({
        id: nextStepId++,
        step_number: s.step_number ?? index + 1,
        description: s.description.trim(),
      })),
    };
  }

  if (payload.category_ids !== undefined) {
    await prisma.recipeCategory.deleteMany({ where: { recipe_id: id } });
    data.recipe_categories = {
      create: payload.category_ids.map((cId) => ({ category_id: cId })),
    };
  }

  if (payload.tag_ids !== undefined) {
    await prisma.recipeTag.deleteMany({ where: { recipe_id: id } });
    data.recipe_tags = {
      create: payload.tag_ids.map((tId) => ({ tag_id: tId })),
    };
  }

  const recipe = await prisma.recipe.update({
    where: { id },
    data,
    select: {
      id: true,
      title: true,
      image_url: true,
      description: true,
      preparation_time: true,
      difficulty: true,
      average_rating: true,
      rating_count: true,
      created_at: true,
      updated_at: true,
      author: { select: { id: true, username: true } },
      ingredients: { select: { id: true, name: true, quantity: true, unit: true } },
      steps: {
        orderBy: { step_number: "asc" },
        select: { id: true, step_number: true, description: true },
      },
      recipe_categories: { select: { category: { select: { id: true, name: true } } } },
      recipe_tags: { select: { tag: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(
    {
      recipe: {
        ...recipe,
        categories: recipe.recipe_categories.map((rc) => rc.category),
        tags: recipe.recipe_tags.map((rt) => rt.tag),
        recipe_categories: undefined,
        recipe_tags: undefined,
      },
    },
    { status: 200 },
  );
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { recipeId } = await params;
  const id = parseRecipeId(recipeId);

  if (id === null) {
    return NextResponse.json({ error: "Invalid recipe ID." }, { status: 400 });
  }

  const existing = await prisma.recipe.findUnique({
    where: { id },
    select: { author_id: true, is_deleted: true },
  });

  if (!existing || existing.is_deleted) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  if (existing.author_id !== auth.sub && auth.role !== "admin") {
    return NextResponse.json({ error: "Not authorized to delete this recipe." }, { status: 403 });
  }

  await prisma.recipe.update({
    where: { id },
    data: { is_deleted: true, updated_at: new Date() },
  });

  return NextResponse.json({ message: "Recipe deleted successfully." }, { status: 200 });
}
