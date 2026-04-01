"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import RecipeCard from "./RecipeCard";

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
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

type Category = {
  id: number;
  name: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export default function RecipeList() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [searchMode, setSearchMode] = useState<"recipe" | "username">(() =>
    searchParams.get("mode") === "username" ? "username" : "recipe",
  );
  const [difficulty, setDifficulty] = useState(() => searchParams.get("difficulty") ?? "");
  const [sort, setSort] = useState(() => searchParams.get("sort") ?? "created_at");
  const [order, setOrder] = useState<"asc" | "desc">(() =>
    searchParams.get("order") === "asc" ? "asc" : "desc",
  );
  const [sortOpen, setSortOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(() => {
    const v = searchParams.get("category_ids");
    return v ? v.split(",").map(Number).filter(Boolean) : [];
  });

  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (query) p.set("q", query);
    if (searchMode === "username") p.set("mode", "username");
    if (difficulty) p.set("difficulty", difficulty);
    if (sort !== "created_at") p.set("sort", sort);
    if (order !== "desc") p.set("order", order);
    if (selectedCategoryIds.length > 0) p.set("category_ids", selectedCategoryIds.join(","));
    routerRef.current.replace(`?${p.toString()}`, { scroll: false });
  }, [page, query, searchMode, difficulty, sort, order, selectedCategoryIds]);

  const sortOptions = [
    { value: "created_at", label: "Dátum" },
    { value: "average_rating", label: "Értékelés" },
    { value: "preparation_time", label: "Elkészítési idő" },
  ] as const;

  const currentSortLabel = sortOptions.find((o) => o.value === sort)?.label ?? "Rendezés";
  const sortLabelRef = useRef<HTMLSpanElement>(null);
  const [labelOverflows, setLabelOverflows] = useState(false);

  useEffect(() => {
    const el = sortLabelRef.current;
    if (el) {
      setLabelOverflows(el.scrollWidth > el.parentElement!.clientWidth);
    }
  }, [sort]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      limit: "12",
      sort,
      order,
    });
    if (query && searchMode === "recipe") params.set("query", query);
    if (difficulty) params.set("difficulty", difficulty);
    if (selectedCategoryIds.length > 0) params.set("category_ids", selectedCategoryIds.join(","));

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
  }, [page, query, searchMode, difficulty, sort, order, selectedCategoryIds]);

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
  }

  const hasActiveFilters =
    query !== "" ||
    searchMode !== "recipe" ||
    difficulty !== "" ||
    sort !== "created_at" ||
    order !== "desc" ||
    selectedCategoryIds.length > 0;

  function handleReset() {
    setQuery("");
    setSearchMode("recipe");
    setDifficulty("");
    setSort("created_at");
    setOrder("desc");
    setSelectedCategoryIds([]);
    setPage(1);
  }

  const visibleRecipes =
    searchMode === "username" && query
      ? recipes.filter((r) => r.author.username.toLowerCase().includes(query.toLowerCase()))
      : recipes;

  return (
    <div>
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="join flex-1 min-w-64">
          <select
            value={searchMode}
            onChange={(e) => {
              setSearchMode(e.target.value as "recipe" | "username");
              setQuery("");
              setPage(1);
            }}
            className="select select-bordered join-item w-40"
          >
            <option value="recipe">Recept neve</option>
            <option value="username">Felhasználónév</option>
          </select>
          <input
            type="text"
            placeholder={
              searchMode === "username"
                ? "Felhasználónév keresése..."
                : "Keresés receptek között..."
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="input input-bordered join-item flex-1"
          />
        </div>

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

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            className="btn btn-outline gap-1 max-w-36"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M3 3a1 1 0 011-1h2a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm6 2a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zm6 4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2a1 1 0 01-1-1V9z" />
            </svg>
            <span className="overflow-hidden max-w-16">
              <span
                ref={sortLabelRef}
                key={sort}
                className={`inline-block whitespace-nowrap ${labelOverflows ? "sort-label-slide" : ""}`}
              >
                {currentSortLabel}
              </span>
            </span>
            <span className="text-xs opacity-60 shrink-0">{order === "desc" ? "↓" : "↑"}</span>
          </button>

          {sortOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 mt-2 z-20 bg-base-100 border border-base-300 rounded-box shadow-lg p-2 min-w-48">
                <p className="text-xs font-semibold text-base-content/50 px-3 py-1">Rendezés</p>
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSort(opt.value);
                      setPage(1);
                      setSortOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm hover:bg-base-200 ${sort === opt.value ? "font-bold text-primary" : ""}`}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="divider my-1" />
                <p className="text-xs font-semibold text-base-content/50 px-3 py-1">Sorrend</p>
                <button
                  type="button"
                  onClick={() => {
                    setOrder("desc");
                    setPage(1);
                    setSortOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm hover:bg-base-200 ${order === "desc" ? "font-bold text-primary" : ""}`}
                >
                  ↓ Csökkenő
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrder("asc");
                    setPage(1);
                    setSortOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm hover:bg-base-200 ${order === "asc" ? "font-bold text-primary" : ""}`}
                >
                  ↑ Növekvő
                </button>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={!hasActiveFilters}
          className={`btn btn-ghost btn-sm ${hasActiveFilters ? "text-error" : "text-base-content/30"}`}
          title="Szűrők törlése"
        >
          ✕
        </button>
      </form>

      {/* Category filter buttons */}
      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategoryIds((prev) =>
                  prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id],
                );
                setPage(1);
              }}
              className={`btn btn-sm btn-outline ${
                selectedCategoryIds.includes(cat.id) ? "btn-primary" : ""
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

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
          {visibleRecipes.length === 0 ? (
            <p className="text-center text-base-content/50">Nem található recept.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {visibleRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}

          {pagination && pagination.total_pages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
