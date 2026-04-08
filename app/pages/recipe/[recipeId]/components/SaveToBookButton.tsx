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
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPublic, setNewPublic] = useState(false);
  const [creating, setCreating] = useState(false);

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
      setShowCreate(false);
      setNewName("");
      setNewPublic(false);
      fetchBooks();
    }
  }, [open]);

  const handleCreateAndSave = async () => {
    const token = localStorage.getItem("token");
    if (!token || !newName.trim()) return;

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const createRes = await fetch("/api/recipe-books", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName.trim(), is_public: newPublic }),
      });

      if (!createRes.ok) {
        const data = await createRes.json().catch(() => null);
        throw new Error(data?.error ?? "Nem sikerült létrehozni.");
      }

      const { recipe_book } = await createRes.json();

      const addRes = await fetch(`/api/recipe-books/${recipe_book.id}/recipes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipeId: Number(recipeId) }),
      });

      if (addRes.ok) {
        setSuccess(`"${recipe_book.name}" létrehozva és recept hozzáadva!`);
      } else {
        setSuccess(`"${recipe_book.name}" létrehozva, de a recept hozzáadása nem sikerült.`);
      }

      setShowCreate(false);
      setNewName("");
      setNewPublic(false);
      fetchBooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba.");
    } finally {
      setCreating(false);
    }
  };

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
            ) : (
              <>
                {books.length > 0 && (
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
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
                          <span className="text-xs text-base-content/50">
                            {b.recipe_count} recept
                          </span>
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

                {books.length === 0 && !showCreate && (
                  <p className="text-base-content/50 text-center py-4 text-sm">
                    Még nincs receptkönyved.
                  </p>
                )}

                {/* Inline create form */}
                {showCreate ? (
                  <div className="border border-base-300 rounded-lg p-3 mt-2 flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Receptkönyv neve"
                      className="input input-sm input-bordered w-full"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newName.trim()) handleCreateAndSave();
                      }}
                      autoFocus
                      maxLength={100}
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="toggle toggle-sm toggle-primary"
                        checked={newPublic}
                        onChange={(e) => setNewPublic(e.target.checked)}
                      />
                      Publikus
                    </label>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-sm btn-primary flex-1"
                        disabled={!newName.trim() || creating}
                        onClick={handleCreateAndSave}
                      >
                        {creating ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          "Létrehozás és mentés"
                        )}
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setShowCreate(false);
                          setNewName("");
                          setNewPublic(false);
                        }}
                      >
                        Mégse
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm w-full mt-2 gap-1 text-primary"
                    onClick={() => setShowCreate(true)}
                  >
                    + Új receptkönyv létrehozása
                  </button>
                )}
              </>
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
