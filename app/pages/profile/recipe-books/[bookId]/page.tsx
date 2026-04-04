"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../main/components/Navbar";
import BookRecipeCard from "./components/BookRecipeCard";
import EditBookModal from "./components/EditBookModal";

type RecipeBook = {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  recipe_count: number;
  created_at: string;
  updated_at: string;
  owner: { id: number; username: string; profile_image_url: string | null };
};

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  preparation_time: number;
  difficulty: string;
  average_rating: number;
  rating_count: number;
  author: { id: number; username: string; profile_image_url: string | null };
};

export default function RecipeBookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();

  const [book, setBook] = useState<RecipeBook | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editOpen, setEditOpen] = useState(false);

  const getHeaders = (): HeadersInit => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/recipe-books/${bookId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Receptfüzet nem található.");
      const data = await res.json();
      setBook(data.recipe_book);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba.");
    }
  }, [bookId]);

  const fetchRecipes = useCallback(
    async (p: number) => {
      try {
        const res = await fetch(`/api/recipe-books/${bookId}/recipes?page=${p}&limit=12`, {
          headers: getHeaders(),
        });
        if (!res.ok) throw new Error("Nem sikerült betölteni a recepteket.");
        const data = await res.json();
        setRecipes(data.recipes);
        setTotalPages(data.pagination.total_pages);
        setPage(data.pagination.page);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ismeretlen hiba.");
      }
    },
    [bookId],
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBook(), fetchRecipes(1)]).finally(() => setLoading(false));
  }, [fetchBook, fetchRecipes]);

  const handleRemoveRecipe = async (recipeId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`/api/recipe-books/${bookId}/recipes/${recipeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchRecipes(page);
        await fetchBook();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Nem sikerült eltávolítani a receptet.");
      }
    } catch {
      setError("Hálózati hiba történt.");
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

  if (error || !book) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navbar />
        <div className="max-w-4xl mx-auto px-5 py-16 text-center">
          <div className="alert alert-error">
            <span>{error ?? "Ismeretlen hiba történt."}</span>
          </div>
          <Link href="/pages/profile/recipe-books" className="btn btn-primary mt-6">
            ← Vissza a receptfüzetekhez
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/pages/profile/recipe-books" className="btn btn-ghost btn-sm">
            ← Receptfüzetek
          </Link>
        </div>

        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">📖 {book.name}</h1>
                {book.description && (
                  <p className="text-base-content/60 mt-1">{book.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${book.is_public ? "badge-success" : "badge-ghost"}`}>
                  {book.is_public ? "Publikus" : "Privát"}
                </span>
                <button
                  className="btn btn-sm btn-outline btn-primary"
                  onClick={() => setEditOpen(true)}
                >
                  ✏️ Szerkesztés
                </button>
              </div>
            </div>
            <div className="text-sm text-base-content/50 mt-2">
              🍽️ {book.recipe_count} recept · Létrehozva:{" "}
              {new Date(book.created_at).toLocaleDateString("hu-HU")}
            </div>
          </div>
        </div>

        {recipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-base-content/50 text-lg">Ez a receptfüzet még üres.</p>
            <Link href="/pages/main" className="btn btn-primary mt-4">
              Böngéssz recepteket és add hozzá!
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((r) => (
                <BookRecipeCard key={r.id} recipe={r} onRemove={handleRemoveRecipe} />
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

      {editOpen && (
        <EditBookModal
          book={book}
          bookId={book.id}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            fetchBook();
          }}
        />
      )}
    </div>
  );
}
