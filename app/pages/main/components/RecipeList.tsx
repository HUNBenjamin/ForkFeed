"use client";
import React, { useEffect, useState } from "react";
import RecipeCard from "./RecipeCard";

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  preparation_time: number;
  difficulty: string;
  average_rating: number;
  rating_count: number;
  author: {
    id: number;
    username: string;
    profile_image_url: string | null;
  };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export default function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState("created_at");

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      limit: "12",
      sort,
      order: "desc",
    });
    if (query) params.set("query", query);
    if (difficulty) params.set("difficulty", difficulty);

    fetch(`/api/recipes?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Nem sikerült betölteni a recepteket");
        return res.json();
      })
      .then((data) => {
        setRecipes(data.recipes);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, query, difficulty, sort]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6 items-center">
        <input
          type="text"
          placeholder="Keresés receptek között..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="input input-bordered flex-1 min-w-48"
        />

        <select
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value);
            setPage(1);
          }}
          className="select select-bordered"
        >
          <option value="">Minden nehézség</option>
          <option value="easy">Könnyű</option>
          <option value="medium">Közepes</option>
          <option value="hard">Nehéz</option>
        </select>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="select select-bordered"
        >
          <option value="created_at">Legújabb</option>
          <option value="average_rating">Legjobb értékelés</option>
          <option value="preparation_time">Elkészítési idő</option>
        </select>
      </form>

      {loading && (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {error && (
        <div className="alert alert-error max-w-md mx-auto">
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && recipes.length === 0 && (
        <p className="text-center text-base-content/50">Nem található recept.</p>
      )}

      {!loading && !error && recipes.length > 0 && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn btn-sm btn-outline"
              >
                ← Előző
              </button>
              <span className="text-sm text-base-content/60">
                {page} / {pagination.total_pages}
              </span>
              <button
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="btn btn-sm btn-outline"
              >
                Következő →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
