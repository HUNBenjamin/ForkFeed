"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../main/components/Navbar";
import ProfileTabs from "../components/ProfileTabs";
import FavoriteRecipeCard from "./components/FavoriteRecipeCard";
import Pagination from "@/app/components/Pagination";

type FavoriteRecipe = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  preparation_time: number;
  difficulty: string;
  average_rating: number;
  rating_count: number;
  created_at: string;
  author: {
    id: number;
    username: string;
    profile_image_url: string | null;
  };
};

type Favorite = {
  id: number;
  created_at: string;
  recipe: FavoriteRecipe;
};

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFavorites = async (p: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/pages/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/me/favorites?page=${p}&limit=12&expanded=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/pages/login");
          return;
        }
        throw new Error("Nem sikerült betölteni a kedvenceket.");
      }
      const data = await res.json();
      setFavorites(data.favorites);
      setTotalPages(data.pagination.total_pages);
      setPage(data.pagination.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites(1);
  }, []);

  const handleRemove = async (recipeId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchFavorites(page);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Nem sikerült eltávolítani a kedvencekből.");
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
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-base-content/50 text-lg">Még nincsenek kedvenceid.</p>
            <Link href="/pages/main" className="btn btn-primary mt-4">
              Fedezd fel a recepteket
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((f) => (
                <FavoriteRecipeCard
                  key={f.id}
                  recipe={f.recipe}
                  favoritedAt={f.created_at}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onPageChange={fetchFavorites} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
