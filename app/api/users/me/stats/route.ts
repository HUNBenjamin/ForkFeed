import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [recipesCount, commentsCount, ratingsCount, favoritesCount, recipeBooksCount, avgRating] =
    await Promise.all([
      prisma.recipe.count({ where: { author_id: auth.sub, is_deleted: false } }),
      prisma.comment.count({ where: { user_id: auth.sub, is_deleted: false } }),
      prisma.rating.count({ where: { user_id: auth.sub } }),
      prisma.favorite.count({ where: { user_id: auth.sub } }),
      prisma.recipeBook.count({ where: { owner_id: auth.sub } }),
      prisma.recipe.aggregate({
        where: { author_id: auth.sub, is_deleted: false },
        _avg: { average_rating: true },
      }),
    ]);

  return NextResponse.json(
    {
      stats: {
        recipes_count: recipesCount,
        comments_count: commentsCount,
        ratings_given_count: ratingsCount,
        favorites_count: favoritesCount,
        recipe_books_count: recipeBooksCount,
        average_recipe_rating: avgRating._avg.average_rating ?? 0,
      },
    },
    { status: 200 },
  );
}
