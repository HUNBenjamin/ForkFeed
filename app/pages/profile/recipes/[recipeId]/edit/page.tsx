"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../../main/components/Navbar";
import BasicFields from "./components/BasicFields";
import IngredientsEditor from "./components/IngredientsEditor";
import StepsEditor from "./components/StepsEditor";
import TagCategoryPicker from "./components/TagCategoryPicker";
import type { RecipeForm, Ingredient, Step } from "./types";

type RecipeData = {
  id: number;
  title: string;
  description: string | null;
  preparation_time: number;
  difficulty: string;
  ingredients: { id: number; name: string; quantity: number | null; unit: string | null }[];
  steps: { id: number; step_number: number; description: string }[];
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
};

export default function EditRecipePage() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<RecipeForm>({
    title: "",
    description: "",
    preparation_time: 30,
    difficulty: "easy",
    ingredients: [],
    steps: [],
    category_ids: [],
    tag_ids: [],
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/pages/login");
      return;
    }

    fetch(`/api/recipes/${recipeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("A recept nem található.");
        return r.json();
      })
      .then((data) => {
        const r: RecipeData = data.recipe;
        setForm({
          title: r.title,
          description: r.description ?? "",
          preparation_time: r.preparation_time,
          difficulty: r.difficulty,
          ingredients: r.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
          steps: r.steps.map((s) => ({
            step_number: s.step_number,
            description: s.description,
          })),
          category_ids: r.categories.map((c) => c.id),
          tag_ids: r.tags.map((t) => t.id),
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [recipeId, router]);

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!form.title.trim()) {
      setError("A cím megadása kötelező.");
      return;
    }
    if (form.preparation_time <= 0) {
      setError("Az elkészítési idő pozitív szám kell legyen.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          preparation_time: Math.round(form.preparation_time),
          difficulty: form.difficulty,
          ingredients: form.ingredients.filter((ing) => ing.name.trim()),
          steps: form.steps
            .filter((s) => s.description.trim())
            .map((s, i) => ({ step_number: i + 1, description: s.description.trim() })),
          category_ids: form.category_ids,
          tag_ids: form.tag_ids,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        router.push("/pages/profile/recipes");
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Nem sikerült menteni a módosításokat.");
      }
    } catch {
      setError("Hálózati hiba történt.");
    } finally {
      setSaving(false);
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

  if (error && !form.title) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navbar />
        <div className="max-w-3xl mx-auto px-5 py-16 text-center">
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
          <Link href="/pages/profile/recipes" className="btn btn-primary mt-6">
            ← Vissza a receptjeimhez
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="max-w-3xl mx-auto px-5 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/pages/profile/recipes" className="btn btn-ghost btn-sm">
            ← Vissza
          </Link>
          <h1 className="text-2xl font-bold">Recept szerkesztése</h1>
        </div>

        {error && (
          <div className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success text-sm">
            <span>Sikeresen mentve!</span>
          </div>
        )}

        <div className="card bg-base-100 shadow-md">
          <div className="card-body flex flex-col gap-6">
            <BasicFields
              title={form.title}
              description={form.description}
              preparation_time={form.preparation_time}
              difficulty={form.difficulty}
              onChangeTitle={(v) => setForm((f) => ({ ...f, title: v }))}
              onChangeDescription={(v) => setForm((f) => ({ ...f, description: v }))}
              onChangePrepTime={(v) => setForm((f) => ({ ...f, preparation_time: v }))}
              onChangeDifficulty={(v) => setForm((f) => ({ ...f, difficulty: v }))}
            />

            <div className="divider" />

            <IngredientsEditor
              ingredients={form.ingredients}
              onChange={(ingredients: Ingredient[]) => setForm((f) => ({ ...f, ingredients }))}
            />

            <div className="divider" />

            <StepsEditor
              steps={form.steps}
              onChange={(steps: Step[]) => setForm((f) => ({ ...f, steps }))}
            />

            <div className="divider" />

            <TagCategoryPicker
              selectedCategoryIds={form.category_ids}
              selectedTagIds={form.tag_ids}
              onChangeCategories={(ids) => setForm((f) => ({ ...f, category_ids: ids }))}
              onChangeTags={(ids) => setForm((f) => ({ ...f, tag_ids: ids }))}
            />

            <div className="divider" />

            <div className="flex gap-3 justify-end">
              <Link href="/pages/profile/recipes" className="btn btn-ghost">
                Mégse
              </Link>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : "💾 Mentés"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
