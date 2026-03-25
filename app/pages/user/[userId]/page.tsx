"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../main/components/Navbar";

type User = {
  id: number;
  username: string;
  profile_image_url: string | null;
  bio: string | null;
  created_at: string;
};

type Stats = {
  recipes_count: number;
  recipe_books_count: number;
  average_recipe_rating: number;
};

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  preparation_time: number;
  difficulty: string;
  average_rating: number;
  rating_count: number;
  created_at: string;
};

type RecipeBook = {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  recipe_count: number;
  created_at: string;
};

const difficultyLabels: Record<string, string> = {
  easy: "Könnyű",
  medium: "Közepes",
  hard: "Nehéz",
};

const difficultyBadge: Record<string, string> = {
  easy: "badge-success",
  medium: "badge-warning",
  hard: "badge-error",
};

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeBooks, setRecipeBooks] = useState<RecipeBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recipePage, setRecipePage] = useState(1);
  const [recipeTotalPages, setRecipeTotalPages] = useState(1);
  const [bookPage, setBookPage] = useState(1);
  const [bookTotalPages, setBookTotalPages] = useState(1);

  const [tab, setTab] = useState<"recipes" | "books">("recipes");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/users/${userId}`).then((r) => (r.ok ? r.json() : Promise.reject("User not found"))),
      fetch(`/api/users/${userId}/stats`).then((r) => (r.ok ? r.json() : Promise.reject("Stats not found"))),
      fetch(`/api/users/${userId}/recipes?page=1&limit=12`).then((r) => (r.ok ? r.json() : Promise.reject("Recipes not found"))),
      fetch(`/api/users/${userId}/recipe-books?page=1&limit=12`).then((r) => (r.ok ? r.json() : Promise.reject("Books not found"))),
    ])
      .then(([userData, statsData, recipesData, booksData]) => {
        setUser(userData.user);
        setStats(statsData.stats);
        setRecipes(recipesData.recipes);
        setRecipeTotalPages(recipesData.pagination.total_pages);
        setRecipeBooks(booksData.recipe_books);
        setBookTotalPages(booksData.pagination.total_pages);
      })
      .catch(() => setError("Nem sikerült betölteni a felhasználó profilját."))
      .finally(() => setLoading(false));
  }, [userId]);

  const fetchRecipes = async (p: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/recipes?page=${p}&limit=12`);
      if (!res.ok) return;
      const data = await res.json();
      setRecipes(data.recipes);
      setRecipePage(data.pagination.page);
      setRecipeTotalPages(data.pagination.total_pages);
    } catch {
      /* ignore */
    }
  };

  const fetchBooks = async (p: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/recipe-books?page=${p}&limit=12`);
      if (!res.ok) return;
      const data = await res.json();
      setRecipeBooks(data.recipe_books);
      setBookPage(data.pagination.page);
      setBookTotalPages(data.pagination.total_pages);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navbar />
        <div className="flex justify-center py-24">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navbar />
        <div className="max-w-4xl mx-auto px-5 py-16 text-center">
          <div className="alert alert-error">
            <span>{error ?? "A felhasználó nem található."}</span>
          </div>
          <Link href="/pages/main" className="btn btn-primary mt-6">
            ← Vissza a főoldalra
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="max-w-4xl mx-auto px-5 py-8 flex flex-col gap-6">
        {/* Back button */}
        <Link href="/pages/main" className="btn btn-ghost btn-sm self-start gap-1">
          ← Vissza
        </Link>

        {/* User profile card */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body flex flex-col items-center gap-4">
            {/* Avatar */}
            <div className="avatar placeholder">
              <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 bg-primary text-primary-content flex items-center justify-center">
                {user.profile_image_url ? (
                  <img src={user.profile_image_url} alt={user.username} className="rounded-full" />
                ) : (
                  <span className="text-3xl font-bold select-none">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="text-center">
              <h1 className="text-2xl font-bold">{user.username}</h1>
              {user.bio && (
                <p className="mt-3 text-base-content/70 text-sm leading-relaxed max-w-md">
                  {user.bio}
                </p>
              )}
              <p className="mt-2 text-xs text-base-content/40">
                Csatlakozott: {new Date(user.created_at).toLocaleDateString("hu-HU")}
              </p>
            </div>
          </div>
        </div>

        {/* Stats card */}
        {stats && (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-lg mb-2">Statisztikák</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-base-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{stats.recipes_count}</div>
                  <div className="text-xs text-base-content/50 mt-1">Receptek</div>
                </div>
                <div className="bg-base-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{stats.recipe_books_count}</div>
                  <div className="text-xs text-base-content/50 mt-1">Receptfüzetek</div>
                </div>
                <div className="bg-base-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {stats.average_recipe_rating > 0
                      ? `⭐ ${stats.average_recipe_rating.toFixed(1)}`
                      : "–"}
                  </div>
                  <div className="text-xs text-base-content/50 mt-1">Átlag értékelés</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab selector */}
        <div className="tabs tabs-boxed self-start">
          <button
            className={`tab ${tab === "recipes" ? "tab-active" : ""}`}
            onClick={() => setTab("recipes")}
          >
            Receptek
          </button>
          <button
            className={`tab ${tab === "books" ? "tab-active" : ""}`}
            onClick={() => setTab("books")}
          >
            Receptfüzetek
          </button>
        </div>

        {/* Recipes tab */}
        {tab === "recipes" && (
          <>
            {recipes.length === 0 ? (
              <p className="text-center text-base-content/50 py-8">
                Ennek a felhasználónak még nincsenek receptjei.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.map((r) => (
                  <Link
                    key={r.id}
                    href={`/pages/recipe/${r.id}`}
                    className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="card-body p-4 flex flex-col gap-2">
                      <h3 className="card-title text-base">{r.title}</h3>
                      {r.description && (
                        <p className="text-sm text-base-content/60 line-clamp-2">{r.description}</p>
                      )}
                      <div className="mt-auto flex flex-wrap gap-2 items-center text-sm">
                        <span
                          className={`badge badge-sm ${difficultyBadge[r.difficulty] ?? "badge-ghost"}`}
                        >
                          {difficultyLabels[r.difficulty] ?? r.difficulty}
                        </span>
                        <span className="text-base-content/50">⏱ {r.preparation_time} perc</span>
                        {r.rating_count > 0 && (
                          <span className="text-warning">
                            ⭐ {r.average_rating.toFixed(1)} ({r.rating_count})
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {recipeTotalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={recipePage <= 1}
                  onClick={() => fetchRecipes(recipePage - 1)}
                >
                  ← Előző
                </button>
                <span className="text-sm flex items-center text-base-content/60">
                  {recipePage} / {recipeTotalPages}
                </span>
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={recipePage >= recipeTotalPages}
                  onClick={() => fetchRecipes(recipePage + 1)}
                >
                  Következő →
                </button>
              </div>
            )}
          </>
        )}

        {/* Recipe books tab */}
        {tab === "books" && (
          <>
            {recipeBooks.length === 0 ? (
              <p className="text-center text-base-content/50 py-8">
                Ennek a felhasználónak még nincsenek nyilvános receptfüzetei.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipeBooks.map((b) => (
                  <div key={b.id} className="card bg-base-100 shadow-md">
                    <div className="card-body p-4 flex flex-col gap-2">
                      <h3 className="card-title text-base">📖 {b.name}</h3>
                      {b.description && (
                        <p className="text-sm text-base-content/60 line-clamp-2">
                          {b.description}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap gap-2 items-center text-sm text-base-content/50">
                        <span>📝 {b.recipe_count} recept</span>
                        <span>
                          {new Date(b.created_at).toLocaleDateString("hu-HU")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bookTotalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={bookPage <= 1}
                  onClick={() => fetchBooks(bookPage - 1)}
                >
                  ← Előző
                </button>
                <span className="text-sm flex items-center text-base-content/60">
                  {bookPage} / {bookTotalPages}
                </span>
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={bookPage >= bookTotalPages}
                  onClick={() => fetchBooks(bookPage + 1)}
                >
                  Következő →
                </button>
              </div>
            )}
          </>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
