import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, optionalAuth } from "@/lib/auth";

export const runtime = "nodejs";

interface IngredientInput {
  name: string;
  quantity?: number | null;
  unit?: string | null;
}

interface StepInput {
  step_number: number;
  description: string;
}

interface RecipePayload {
  title?: string;
  description?: string | null;
  preparation_time?: number;
  difficulty?: string;
  image_url?: string | null;
  ingredients?: IngredientInput[];
  steps?: StepInput[];
  category_ids?: number[];
  tag_ids?: number[];
}

async function getNextId(model: "recipe" | "ingredient" | "step") {
  if (model === "recipe") {
    const last = await prisma.recipe.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
    return (last?.id ?? 0) + 1;
  }
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

const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard"];

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let payload: RecipePayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const title = payload.title?.trim();
  const description = payload.description?.trim() ?? null;
  const preparation_time = payload.preparation_time;
  const difficulty = payload.difficulty?.trim();

  if (!title || !preparation_time || !difficulty) {
    return NextResponse.json(
      { error: "title, preparation_time and difficulty are required." },
      { status: 400 },
    );
  }

  if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json(
      { error: `Invalid difficulty. Allowed: ${ALLOWED_DIFFICULTIES.join(", ")}` },
      { status: 400 },
    );
  }

  if (preparation_time <= 0 || !Number.isInteger(preparation_time)) {
    return NextResponse.json(
      { error: "preparation_time must be a positive integer (minutes)." },
      { status: 400 },
    );
  }

  const recipeId = await getNextId("recipe");

  const ingredients = payload.ingredients ?? [];
  let nextIngredientId = await getNextId("ingredient");
  const ingredientData = ingredients.map((ing) => ({
    id: nextIngredientId++,
    name: ing.name.trim(),
    quantity: ing.quantity ?? null,
    unit: ing.unit?.trim() ?? null,
  }));

  const steps = payload.steps ?? [];
  let nextStepId = await getNextId("step");
  const stepData = steps.map((s, index) => ({
    id: nextStepId++,
    step_number: s.step_number ?? index + 1,
    description: s.description.trim(),
  }));

  const categoryIds = payload.category_ids ?? [];
  const categoryLinks = categoryIds.map((cId) => ({ category_id: cId }));

  const tagIds = payload.tag_ids ?? [];
  const tagLinks = tagIds.map((tId) => ({ tag_id: tId }));

  const recipe = await prisma.recipe.create({
    data: {
      id: recipeId,
      title,
      description,
      preparation_time,
      difficulty,
      image_url: payload.image_url ?? null,
      author_id: auth.sub,
      ingredients: { create: ingredientData },
      steps: { create: stepData },
      recipe_categories: { create: categoryLinks },
      recipe_tags: { create: tagLinks },
    },
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
      author: {
        select: { id: true, username: true, profile_image_url: true },
      },
      ingredients: {
        select: { id: true, name: true, quantity: true, unit: true },
      },
      steps: {
        orderBy: { step_number: "asc" },
        select: { id: true, step_number: true, description: true },
      },
      recipe_categories: {
        select: { category: { select: { id: true, name: true } } },
      },
      recipe_tags: {
        select: { tag: { select: { id: true, name: true } } },
      },
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
    { status: 201 },
  );
}

export async function GET(request: NextRequest) {
  const auth = await optionalAuth(request);
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  const query = searchParams.get("query")?.trim() ?? "";
  const difficulty = searchParams.get("difficulty")?.trim() ?? "";
  const sortBy = searchParams.get("sort") ?? "created_at";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const categoryIdRaw = searchParams.get("category_id");
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : null;

  const where: Record<string, unknown> = { is_deleted: false };

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  if (difficulty) {
    where.difficulty = difficulty;
  }

  if (categoryId) {
    where.recipe_categories = { some: { category_id: categoryId } };
  }

  const allowedSortFields: Record<string, string> = {
    created_at: "created_at",
    average_rating: "average_rating",
    preparation_time: "preparation_time",
    rating_count: "rating_count",
  };

  const orderByField = allowedSortFields[sortBy] ?? "created_at";

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy: { [orderByField]: order },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        image_url: true,
        preparation_time: true,
        difficulty: true,
        average_rating: true,
        rating_count: true,
        created_at: true,
        author: {
          select: {
            id: true,
            username: true,
            profile_image_url: true,
          },
        },
        recipe_categories: {
          select: { category: { select: { id: true, name: true } } },
        },
        recipe_tags: {
          select: { tag: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.recipe.count({ where }),
  ]);

  const recipeIds = recipes.map((r) => r.id);
  let favSet = new Set<number>();
  let ratingMap = new Map<number, number>();

  if (auth) {
    const [favs, myRatings] = await Promise.all([
      prisma.favorite.findMany({
        where: { user_id: auth.sub, recipe_id: { in: recipeIds } },
        select: { recipe_id: true },
      }),
      prisma.rating.findMany({
        where: { user_id: auth.sub, recipe_id: { in: recipeIds } },
        select: { recipe_id: true, rating: true },
      }),
    ]);
    favSet = new Set(favs.map((f) => f.recipe_id));
    ratingMap = new Map(myRatings.map((r) => [r.recipe_id, r.rating]));
  }

  const mapped = recipes.map(({ recipe_categories, recipe_tags, ...r }) => ({
    ...r,
    categories: recipe_categories.map((rc) => rc.category),
    tags: recipe_tags.map((rt) => rt.tag),
    ...(auth !== null
      ? { is_favorite: favSet.has(r.id), my_rating: ratingMap.get(r.id) ?? null }
      : {}),
  }));

  return NextResponse.json(
    {
      recipes: mapped,
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
