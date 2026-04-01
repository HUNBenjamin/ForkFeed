"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../main/components/Navbar";
import BasicFields from "../../profile/recipes/[recipeId]/edit/components/BasicFields";
import IngredientsEditor from "../../profile/recipes/[recipeId]/edit/components/IngredientsEditor";
import StepsEditor from "../../profile/recipes/[recipeId]/edit/components/StepsEditor";
import TagCategoryPicker from "../../profile/recipes/[recipeId]/edit/components/TagCategoryPicker";
import ImageUpload, { type ImageUploadHandle } from "../../../components/ImageUpload";
import type { RecipeForm, Ingredient, Step } from "../../profile/recipes/[recipeId]/edit/types";

export default function NewRecipePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageUploadRef = useRef<ImageUploadHandle>(null);

  const [form, setForm] = useState<RecipeForm>({
    title: "",
    description: "",
    preparation_time: 30,
    difficulty: "easy",
    image_url: null,
    ingredients: [],
    steps: [],
    category_ids: [],
    tag_ids: [],
  });

  const handleCreate = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/pages/login");
      return;
    }

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

    try {
      let imageUrl = form.image_url;
      if (imageUploadRef.current?.hasPendingFile) {
        const uploaded = await imageUploadRef.current.upload();
        if (uploaded) imageUrl = uploaded;
      }

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          preparation_time: Math.round(form.preparation_time),
          difficulty: form.difficulty,
          image_url: imageUrl || null,
          ingredients: form.ingredients.filter((ing) => ing.name.trim()),
          steps: form.steps
            .filter((s) => s.description.trim())
            .map((s, i) => ({ step_number: i + 1, description: s.description.trim() })),
          category_ids: form.category_ids,
          tag_ids: form.tag_ids,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/pages/recipe/${data.recipe?.id ?? ""}`);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Nem sikerült létrehozni a receptet.");
      }
    } catch {
      setError("Hálózati hiba történt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="max-w-3xl mx-auto px-5 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/pages/main" className="btn btn-ghost btn-sm">
            ← Vissza
          </Link>
          <h1 className="text-2xl font-bold">Recept feltöltése</h1>
        </div>

        {error && (
          <div className="alert alert-error text-sm">
            <span>{error}</span>
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

            <ImageUpload
              ref={imageUploadRef}
              type="recipe"
              currentUrl={form.image_url}
              label="Recept képe"
              onUpload={(url) => setForm((f) => ({ ...f, image_url: url || null }))}
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
              <Link href="/pages/main" className="btn btn-ghost">
                Mégse
              </Link>
              <button className="btn btn-primary" disabled={saving} onClick={handleCreate}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : "📤 Feltöltés"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
