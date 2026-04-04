"use client";

import { useEffect, useState } from "react";

type RecipeBook = {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  recipe_count: number;
};

type Props = {
  recipeId: string;
  isLoggedIn: boolean;
};

export default function SaveToBookButton({ recipeId, isLoggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<RecipeBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch("/api/recipe-books?scope=mine&limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBooks(data.recipe_books);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSuccess(null);
      setError(null);
      fetchBooks();
    }
  }, [open]);

  const handleSave = async (bookId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setSaving(bookId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/recipe-books/${bookId}/recipes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipeId: Number(recipeId) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Nem sikerült hozzáadni.");
      }

      const data = await res.json();
      if (data.skipped > 0) {
        setSuccess("Ez a recept már benne van ebben a füzetben.");
      } else {
        setSuccess("Recept hozzáadva a füzethez!");
      }
      fetchBooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba.");
    } finally {
      setSaving(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="tooltip tooltip-bottom" data-tip="Jelentkezz be a mentéshez">
        <button className="btn btn-circle btn-sm btn-ghost btn-disabled">📖</button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-circle btn-sm btn-ghost"
        title="Mentés receptfüzetbe"
      >
        📖
      </button>

      {open && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Mentés receptfüzetbe</h3>

            {error && (
              <div className="alert alert-error text-sm mb-3">
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success text-sm mb-3">
                <span>{success}</span>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-base-content/50 mb-3">Még nincs receptfüzeted.</p>
                <a href="/pages/profile/recipe-books" className="btn btn-primary btn-sm">
                  Receptfüzet létrehozása
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                {books.map((b) => (
                  <button
                    key={b.id}
                    className="btn btn-ghost justify-between h-auto py-3 px-4"
                    onClick={() => handleSave(b.id)}
                    disabled={saving === b.id}
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="font-medium">
                        📖 {b.name}
                        <span
                          className={`badge badge-xs ml-2 ${b.is_public ? "badge-success" : "badge-ghost"}`}
                        >
                          {b.is_public ? "Publikus" : "Privát"}
                        </span>
                      </span>
                      <span className="text-xs text-base-content/50">{b.recipe_count} recept</span>
                    </div>
                    {saving === b.id ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <span className="text-primary">+ Hozzáadás</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                Bezárás
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
