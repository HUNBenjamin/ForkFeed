"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../main/components/Navbar";
import HeroImage from "./components/HeroImage";
import BadgeRow from "./components/BadgeRow";
import AuthorCard from "./components/AuthorCard";
import IngredientList from "./components/IngredientList";
import StepList from "./components/StepList";
import StarRating from "./components/StarRating";
import ShareButton from "./components/ShareButton";
import PrintButton from "./components/PrintButton";
import SectionNav from "./components/SectionNav";
import ScrollToTop from "./components/ScrollToTop";

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  preparation_time: number;
  difficulty: string;
  average_rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string | null;
  author: { id: number; username: string; profile_image_url: string | null };
  ingredients: { id: number; name: string; quantity: number | null; unit: string | null }[];
  steps: { id: number; step_number: number; description: string }[];
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  is_favorite: boolean;
  my_rating: number | null;
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function RecipePage() {
  const { recipeId } = useParams<{ recipeId: string }>();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [myRating, setMyRating] = useState<number | null>(null);

  useEffect(() => {
    if (!recipeId) return;
    setLoading(true);

    fetch(`/api/recipes/${recipeId}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("A recept nem található.");
        return r.json();
      })
      .then((data) => {
        setRecipe(data.recipe);
        setIsFavorite(data.recipe.is_favorite);
        setMyRating(data.recipe.my_rating);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [recipeId]);

  const toggleFavorite = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !recipeId) return;

    const res = await fetch(`/api/recipes/${recipeId}/favorite`, {
      method: isFavorite ? "DELETE" : "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setIsFavorite((f) => !f);
  }, [isFavorite, recipeId]);

  const rateRecipe = useCallback(
    async (value: number) => {
      const token = localStorage.getItem("token");
      if (!token || !recipeId) return;

      const res = await fetch(`/api/recipes/${recipeId}/ratings/me`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });

      if (res.ok) {
        setMyRating(value);
        const r2 = await fetch(`/api/recipes/${recipeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r2.ok) {
          const d = await r2.json();
          setRecipe(d.recipe);
        }
      }
    },
    [recipeId],
  );

  const deleteRating = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !recipeId) return;

    const res = await fetch(`/api/recipes/${recipeId}/ratings/me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setMyRating(null);
      const r2 = await fetch(`/api/recipes/${recipeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r2.ok) {
        const d = await r2.json();
        setRecipe(d.recipe);
      }
    }
  }, [recipeId]);

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

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navbar />
        <div className="max-w-2xl mx-auto px-5 py-16 text-center">
          <div className="alert alert-error">
            <span>{error ?? "Ismeretlen hiba történt."}</span>
          </div>
          <Link href="/pages/main" className="btn btn-primary mt-6">
            ← Vissza a receptekhez
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="max-w-2xl mx-auto px-5 py-8 flex flex-col gap-6">
        <Link href="/pages/main" className="btn btn-ghost btn-sm self-start gap-1">
          ← Vissza
        </Link>

        <HeroImage imageUrl={recipe.image_url} title={recipe.title} />

        <BadgeRow difficulty={recipe.difficulty} categories={recipe.categories} />

        <div className="flex gap-3 items-center">
          <button
            onClick={toggleFavorite}
            className={`btn btn-circle btn-sm ${isFavorite ? "btn-error" : "btn-ghost"}`}
            title={isFavorite ? "Eltávolítás a kedvencekből" : "Hozzáadás a kedvencekhez"}
          >
            {isFavorite ? "❤️" : "🤍"}
          </button>
          <ShareButton />
          <PrintButton title={recipe.title} />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{recipe.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-base-content/60">
          <span>⏱ {recipe.preparation_time} perc</span>
          {recipe.ingredients.length > 0 && (
            <span>🧾 {recipe.ingredients.length} hozzávaló</span>
          )}
          {recipe.rating_count > 0 && (
            <span className="text-warning font-medium">
              ⭐ {recipe.average_rating.toFixed(1)} ({recipe.rating_count} értékelés)
            </span>
          )}
        </div>

        <AuthorCard
          username={recipe.author.username}
          profileImageUrl={recipe.author.profile_image_url}
          createdAt={recipe.created_at}
          updatedAt={recipe.updated_at}
        />

        {recipe.description && (
          <p className="text-base-content/80 leading-relaxed">{recipe.description}</p>
        )}

        <SectionNav
          sections={[
            ...(recipe.ingredients.length > 0
              ? [{ id: "ingredients-section", label: "🧾 Hozzávalók" }]
              : []),
            ...(recipe.steps.length > 0
              ? [{ id: "steps-section", label: "📝 Elkészítés" }]
              : []),
            { id: "rating-section", label: "🏅 Értékelés" },
          ]}
        />

        <div className="divider" />

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map((t) => (
              <span key={t.id} className="badge badge-outline badge-sm">
                #{t.name}
              </span>
            ))}
          </div>
        )}

        <IngredientList ingredients={recipe.ingredients} />

        <div className="divider" />

        <StepList steps={recipe.steps} />

        <div className="divider" />

        <StarRating myRating={myRating} onRate={rateRecipe} onDelete={deleteRating} />

        <div className="h-8" />
      </div>

      <ScrollToTop />
    </div>
  );
}
