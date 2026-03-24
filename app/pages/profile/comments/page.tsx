"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../main/components/Navbar";
import CommentedRecipeCard from "./components/CommentedRecipeCard";

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

export default function MyCommentsPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRecipes = async (p: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/pages/login");
      return;
    }

    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) {
        router.replace("/pages/login");
        return;
      }
      const { user } = await meRes.json();

      const res = await fetch(`/api/users/${user.id}/comments?page=${p}&limit=12`);
      if (!res.ok) throw new Error("Nem sikerült betölteni a recepteket.");
      const data = await res.json();
      setRecipes(data.recipes);
      setTotalPages(data.pagination.total_pages);
      setPage(data.pagination.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes(1);
  }, []);

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/pages/profile" className="btn btn-ghost btn-sm">
              ← Profil
            </Link>
            <h1 className="text-2xl font-bold">Kommentelt receptek</h1>
          </div>
        </div>

        {error && (
          <div className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-base-content/50 text-lg">Még nem kommenteltél egyetlen receptet sem.</p>
            <Link href="/pages/main" className="btn btn-primary mt-4">
              Fedezd fel a recepteket
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((r) => (
                <CommentedRecipeCard key={r.id} recipe={r} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={page <= 1}
                  onClick={() => fetchRecipes(page - 1)}
                >
                  ← Előző
                </button>
                <span className="text-sm flex items-center text-base-content/60">
                  {page} / {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={page >= totalPages}
                  onClick={() => fetchRecipes(page + 1)}
                >
                  Következő →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
