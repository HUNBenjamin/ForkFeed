"use client";
import React, { useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
};

type Tag = {
  id: number;
  name: string;
  created_at: string;
};

export default function TaxonomiesPage() {
  const [tab, setTab] = useState<"categories" | "tags">("categories");

  /* ── Categories state ── */
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  /* ── Tags state ── */
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagLoading, setTagLoading] = useState(true);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const headers = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  /* ── Fetch helpers ── */
  const fetchCategories = async () => {
    setCatLoading(true);
    setCatError(null);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Nem sikerült betölteni.");
      const data = await res.json();
      setCategories(data.categories);
    } catch (e) {
      setCatError(e instanceof Error ? e.message : "Hiba.");
    } finally {
      setCatLoading(false);
    }
  };

  const fetchTags = async () => {
    setTagLoading(true);
    setTagError(null);
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error("Nem sikerült betölteni.");
      const data = await res.json();
      setTags(data.tags);
    } catch (e) {
      setTagError(e instanceof Error ? e.message : "Hiba.");
    } finally {
      setTagLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

  /* ── Category CRUD ── */
  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    const name = catName.trim();
    if (!name) return;

    try {
      if (editingCat) {
        const res = await fetch(`/api/categories/${editingCat.id}`, {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({ name, description: catDesc.trim() || null }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error ?? "Nem sikerült módosítani.");
        }
      } else {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ name, description: catDesc.trim() || null }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error ?? "Nem sikerült létrehozni.");
        }
      }
      setCatName("");
      setCatDesc("");
      setEditingCat(null);
      await fetchCategories();
    } catch (e) {
      setCatError(e instanceof Error ? e.message : "Hiba.");
    }
  };

  const handleCatDelete = async (id: number) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a kategóriát?")) return;
    setCatError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Nem sikerült törölni.");
      }
      await fetchCategories();
    } catch (e) {
      setCatError(e instanceof Error ? e.message : "Hiba.");
    }
  };

  const startEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description ?? "");
  };

  const cancelEditCat = () => {
    setEditingCat(null);
    setCatName("");
    setCatDesc("");
  };

  /* ── Tag CRUD ── */
  const handleTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTagError(null);
    const name = tagName.trim();
    if (!name) return;

    try {
      if (editingTag) {
        const res = await fetch(`/api/tags/${editingTag.id}`, {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error ?? "Nem sikerült módosítani.");
        }
      } else {
        const res = await fetch("/api/tags", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error ?? "Nem sikerült létrehozni.");
        }
      }
      setTagName("");
      setEditingTag(null);
      await fetchTags();
    } catch (e) {
      setTagError(e instanceof Error ? e.message : "Hiba.");
    }
  };

  const handleTagDelete = async (id: number) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a címkét?")) return;
    setTagError(null);
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Nem sikerült törölni.");
      }
      await fetchTags();
    } catch (e) {
      setTagError(e instanceof Error ? e.message : "Hiba.");
    }
  };

  const startEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
  };

  const cancelEditTag = () => {
    setEditingTag(null);
    setTagName("");
  };

  /* ── Render ── */
  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Kategóriák & Címkék</h1>
        <p className="text-sm text-base-content/50 mt-1">
          Kategóriák és címkék kezelése
        </p>
      </div>

      {/* Tab switcher */}
      <div className="tabs tabs-boxed w-fit">
        <button
          className={`tab ${tab === "categories" ? "tab-active" : ""}`}
          onClick={() => setTab("categories")}
        >
          Kategóriák ({categories.length})
        </button>
        <button
          className={`tab ${tab === "tags" ? "tab-active" : ""}`}
          onClick={() => setTab("tags")}
        >
          Címkék ({tags.length})
        </button>
      </div>

      {/* ── Categories tab ── */}
      {tab === "categories" && (
        <div className="flex flex-col gap-4">
          {catError && (
            <div className="alert alert-error text-sm">
              <span>{catError}</span>
            </div>
          )}

          {/* Create / Edit form */}
          <form
            onSubmit={handleCatSubmit}
            className="card bg-base-100 shadow-sm"
          >
            <div className="card-body p-4 flex flex-col gap-3">
              <h3 className="font-semibold text-sm">
                {editingCat ? "Kategória szerkesztése" : "Új kategória"}
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  placeholder="Név"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  placeholder="Leírás (opcionális)"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-sm btn-primary">
                  {editingCat ? "Mentés" : "Létrehozás"}
                </button>
                {editingCat && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={cancelEditCat}
                  >
                    Mégse
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Categories table */}
          {catLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-base-content/50 py-8">
              Nincsenek kategóriák.
            </p>
          ) : (
            <div className="card bg-base-100 shadow-sm overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Név</th>
                    <th>Leírás</th>
                    <th>Létrehozva</th>
                    <th className="text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover">
                      <td className="font-mono text-xs">#{cat.id}</td>
                      <td className="font-medium">{cat.name}</td>
                      <td className="text-sm text-base-content/60 max-w-[200px] truncate">
                        {cat.description ?? "—"}
                      </td>
                      <td className="text-xs text-base-content/50">
                        {new Date(cat.created_at).toLocaleDateString("hu-HU")}
                      </td>
                      <td className="text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            className="btn btn-xs btn-outline btn-primary"
                            onClick={() => startEditCat(cat)}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-xs btn-outline btn-error"
                            onClick={() => handleCatDelete(cat.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tags tab ── */}
      {tab === "tags" && (
        <div className="flex flex-col gap-4">
          {tagError && (
            <div className="alert alert-error text-sm">
              <span>{tagError}</span>
            </div>
          )}

          {/* Create / Edit form */}
          <form
            onSubmit={handleTagSubmit}
            className="card bg-base-100 shadow-sm"
          >
            <div className="card-body p-4 flex flex-col gap-3">
              <h3 className="font-semibold text-sm">
                {editingTag ? "Címke szerkesztése" : "Új címke"}
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1"
                  placeholder="Név"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-sm btn-primary">
                  {editingTag ? "Mentés" : "Létrehozás"}
                </button>
                {editingTag && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={cancelEditTag}
                  >
                    Mégse
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Tags table */}
          {tagLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : tags.length === 0 ? (
            <p className="text-center text-base-content/50 py-8">
              Nincsenek címkék.
            </p>
          ) : (
            <div className="card bg-base-100 shadow-sm overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Név</th>
                    <th>Létrehozva</th>
                    <th className="text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((tag) => (
                    <tr key={tag.id} className="hover">
                      <td className="font-mono text-xs">#{tag.id}</td>
                      <td className="font-medium">{tag.name}</td>
                      <td className="text-xs text-base-content/50">
                        {new Date(tag.created_at).toLocaleDateString("hu-HU")}
                      </td>
                      <td className="text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            className="btn btn-xs btn-outline btn-primary"
                            onClick={() => startEditTag(tag)}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-xs btn-outline btn-error"
                            onClick={() => handleTagDelete(tag.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
