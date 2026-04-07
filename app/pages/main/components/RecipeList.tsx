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

type Tag = {
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [includedCategoryIds, setIncludedCategoryIds] = useState<number[]>(() => {
    const v = searchParams.get("category_ids");
    return v ? v.split(",").map(Number).filter(Boolean) : [];
  });
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<number[]>(() => {
    const v = searchParams.get("exclude_category_ids");
    return v ? v.split(",").map(Number).filter(Boolean) : [];
  });
  const [tags, setTags] = useState<Tag[]>([]);
  const [includedTagIds, setIncludedTagIds] = useState<number[]>(() => {
    const v = searchParams.get("tag_ids");
    return v ? v.split(",").map(Number).filter(Boolean) : [];
  });
  const [excludedTagIds, setExcludedTagIds] = useState<number[]>(() => {
    const v = searchParams.get("exclude_tag_ids");
    return v ? v.split(",").map(Number).filter(Boolean) : [];
  });
  const [includedIngredients, setIncludedIngredients] = useState<string[]>(() => {
    const v = searchParams.get("ingredients");
    return v
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  });
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>(() => {
    const v = searchParams.get("exclude_ingredients");
    return v
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  });
  const [ingredientInput, setIngredientInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []))
      .catch(() => {});
  }, []);

  // Debounce query so the API isn't called on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (debouncedQuery) p.set("q", debouncedQuery);
    if (searchMode === "username") p.set("mode", "username");
    if (difficulty) p.set("difficulty", difficulty);
    if (sort !== "created_at") p.set("sort", sort);
    if (order !== "desc") p.set("order", order);
    if (includedCategoryIds.length > 0) p.set("category_ids", includedCategoryIds.join(","));
    if (excludedCategoryIds.length > 0)
      p.set("exclude_category_ids", excludedCategoryIds.join(","));
    if (includedTagIds.length > 0) p.set("tag_ids", includedTagIds.join(","));
    if (excludedTagIds.length > 0) p.set("exclude_tag_ids", excludedTagIds.join(","));
    if (includedIngredients.length > 0) p.set("ingredients", includedIngredients.join(","));
    if (excludedIngredients.length > 0) p.set("exclude_ingredients", excludedIngredients.join(","));
    routerRef.current.replace(`?${p.toString()}`, { scroll: false });
  }, [
    page,
    debouncedQuery,
    searchMode,
    difficulty,
    sort,
    order,
    includedCategoryIds,
    excludedCategoryIds,
    includedTagIds,
    excludedTagIds,
    includedIngredients,
    excludedIngredients,
  ]);

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
    if (query && searchMode === "recipe") params.set("query", debouncedQuery);
    if (difficulty) params.set("difficulty", difficulty);
    if (includedCategoryIds.length > 0) params.set("category_ids", includedCategoryIds.join(","));
    if (excludedCategoryIds.length > 0)
      params.set("exclude_category_ids", excludedCategoryIds.join(","));
    if (includedTagIds.length > 0) params.set("tag_ids", includedTagIds.join(","));
    if (excludedTagIds.length > 0) params.set("exclude_tag_ids", excludedTagIds.join(","));
    if (includedIngredients.length > 0) params.set("ingredients", includedIngredients.join(","));
    if (excludedIngredients.length > 0)
      params.set("exclude_ingredients", excludedIngredients.join(","));

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
  }, [
    page,
    debouncedQuery,
    searchMode,
    difficulty,
    sort,
    order,
    includedCategoryIds,
    excludedCategoryIds,
    includedTagIds,
    excludedTagIds,
    includedIngredients,
    excludedIngredients,
  ]);

  function handleCategoryToggle(catId: number) {
    if (includedCategoryIds.includes(catId)) {
      setIncludedCategoryIds((prev) => prev.filter((id) => id !== catId));
      setExcludedCategoryIds((prev) => [...prev, catId]);
    } else if (excludedCategoryIds.includes(catId)) {
      setExcludedCategoryIds((prev) => prev.filter((id) => id !== catId));
    } else {
      setIncludedCategoryIds((prev) => [...prev, catId]);
    }
    setPage(1);
  }

  function handleTagToggle(tagId: number) {
    if (includedTagIds.includes(tagId)) {
      setIncludedTagIds((prev) => prev.filter((id) => id !== tagId));
      setExcludedTagIds((prev) => [...prev, tagId]);
    } else if (excludedTagIds.includes(tagId)) {
      setExcludedTagIds((prev) => prev.filter((id) => id !== tagId));
    } else {
      setIncludedTagIds((prev) => [...prev, tagId]);
    }
    setPage(1);
  }

  function addIngredient(name: string, exclude: boolean) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return;
    if (exclude) {
      if (!excludedIngredients.includes(trimmed)) {
        setExcludedIngredients((prev) => [...prev, trimmed]);
      }
    } else {
      if (!includedIngredients.includes(trimmed)) {
        setIncludedIngredients((prev) => [...prev, trimmed]);
      }
    }
    setIngredientInput("");
    setPage(1);
  }

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
    includedCategoryIds.length > 0 ||
    excludedCategoryIds.length > 0 ||
    includedTagIds.length > 0 ||
    excludedTagIds.length > 0 ||
    includedIngredients.length > 0 ||
    excludedIngredients.length > 0;

  function handleReset() {
    setQuery("");
    setSearchMode("recipe");
    setDifficulty("");
    setSort("created_at");
    setOrder("desc");
    setIncludedCategoryIds([]);
    setExcludedCategoryIds([]);
    setIncludedTagIds([]);
    setExcludedTagIds([]);
    setIncludedIngredients([]);
    setExcludedIngredients([]);
    setIngredientInput("");
    setPage(1);
  }

  const visibleRecipes =
    searchMode === "username" && debouncedQuery
      ? recipes.filter((r) =>
          r.author.username.toLowerCase().includes(debouncedQuery.toLowerCase()),
        )
      : recipes;

  function getPageNumbers(current: number, total: number): (number | "...")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (current > 3) pages.push("...");
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  }

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

      {/* Category & Tag filter dropdown */}
      {(categories.length > 0 || tags.length > 0) && (
        <div className="mb-4">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="btn btn-sm btn-outline gap-2"
            >
              Kategóriák & Címkék
              {(includedCategoryIds.length > 0 ||
                excludedCategoryIds.length > 0 ||
                includedTagIds.length > 0 ||
                excludedTagIds.length > 0) && (
                <span className="badge badge-primary badge-sm">
                  {includedCategoryIds.length +
                    excludedCategoryIds.length +
                    includedTagIds.length +
                    excludedTagIds.length}
                </span>
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          {filtersOpen && (
            <div className="mt-2 p-4 border border-base-300 rounded-box bg-base-100 shadow-sm space-y-4">
              {/* Categories section */}
              {categories.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-base-content/50 mb-1">Kategóriák</p>
                  <div className="flex items-center justify-start gap-3 text-xs text-base-content/40 mb-2">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded bg-primary" />✓ Tartalmazza
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded bg-error" />✕ Kizárva
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded border border-base-300" />
                      Nincs szűrés
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const isIncluded = includedCategoryIds.includes(cat.id);
                      const isExcluded = excludedCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryToggle(cat.id)}
                          className={`btn btn-sm ${
                            isIncluded ? "btn-primary" : isExcluded ? "btn-error" : "btn-outline"
                          }`}
                        >
                          {isExcluded && <span>✕</span>}
                          {isIncluded && <span>✓</span>}
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Tags section */}
              {tags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-base-content/50 mb-1">Címkék</p>
                  <div className="flex items-center justify-start gap-3 text-xs text-base-content/40 mb-2">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded bg-primary" />✓ Tartalmazza
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded bg-error" />✕ Kizárva
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded border border-base-300" />
                      Nincs szűrés
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const isIncluded = includedTagIds.includes(tag.id);
                      const isExcluded = excludedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          className={`btn btn-sm ${
                            isIncluded ? "btn-primary" : isExcluded ? "btn-error" : "btn-outline"
                          }`}
                        >
                          {isExcluded && <span>✕</span>}
                          {isIncluded && <span>✓</span>}
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ingredient filter */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-base-content/50 text-center mb-2">Összetevők</p>
        <div className="flex justify-center gap-2 mb-2 flex-wrap">
          <input
            type="text"
            placeholder="Összetevő neve..."
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addIngredient(ingredientInput, false);
              }
            }}
            className="input input-bordered input-sm w-64"
          />
          <button
            type="button"
            onClick={() => addIngredient(ingredientInput, false)}
            className="btn btn-sm btn-primary"
            title="Tartalmazza"
          >
            + Tartalmazza
          </button>
          <button
            type="button"
            onClick={() => addIngredient(ingredientInput, true)}
            className="btn btn-sm btn-error"
            title="Kizárás"
          >
            ✕ Kizárás
          </button>
        </div>
        {(includedIngredients.length > 0 || excludedIngredients.length > 0) && (
          <div className="flex flex-wrap justify-center gap-2">
            {includedIngredients.map((ing) => (
              <span key={`inc-${ing}`} className="badge badge-primary gap-1 py-2">
                ✓ {ing}
                <button
                  type="button"
                  onClick={() => {
                    setIncludedIngredients((prev) => prev.filter((i) => i !== ing));
                    setPage(1);
                  }}
                  className="cursor-pointer hover:opacity-70"
                >
                  ✕
                </button>
              </span>
            ))}
            {excludedIngredients.map((ing) => (
              <span key={`exc-${ing}`} className="badge badge-error gap-1 py-2">
                ✕ {ing}
                <button
                  type="button"
                  onClick={() => {
                    setExcludedIngredients((prev) => prev.filter((i) => i !== ing));
                    setPage(1);
                  }}
                  className="cursor-pointer hover:opacity-70"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

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
            <div className="flex justify-center items-center gap-1 mt-8 flex-wrap">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-sm btn-outline"
              >
                ← Előző
              </button>
              {getPageNumbers(page, pagination.total_pages).map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-1 text-base-content/40">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`btn btn-sm ${p === page ? "btn-primary" : "btn-outline"}`}
                  >
                    {p}
                  </button>
                ),
              )}
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
