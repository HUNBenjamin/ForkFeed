"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../main/components/Navbar";
import ProfileTabs from "../components/ProfileTabs";
import MyRecipeCard from "./components/MyRecipeCard";
import Pagination from "@/app/components/Pagination";

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

export default function MyRecipesPage() {
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

      const res = await fetch(`/api/users/${user.id}/recipes?page=${p}&limit=12`);
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

  const handleDelete = async (recipeId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const confirmed = window.confirm("Biztosan törölni szeretnéd ezt a receptet?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchRecipes(page);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Nem sikerült törölni a receptet.");
      }
    } catch {
      setError("Hálózati hiba történt.");
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />
      <ProfileTabs />

      <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col gap-6">
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
            <p className="text-base-content/50 text-lg">Még nincsenek receptjeid.</p>
            <Link href="/pages/main" className="btn btn-primary mt-4">
              Fedezd fel a recepteket
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((r) => (
                <MyRecipeCard key={r.id} recipe={r} onDelete={handleDelete} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onPageChange={fetchRecipes} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
