import React from "react";

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  preparation_time: number;
  difficulty: string;
  average_rating: number;
  rating_count: number;
  author: {
    id: number;
    username: string;
    profile_image_url: string | null;
  };
};

const difficultyLabels: Record<string, string> = {
  easy: "Könnyű",
  medium: "Közepes",
  hard: "Nehéz",
};

const difficultyBadge: Record<string, string> = {
  easy: "badge-success",
  medium: "badge-warning",
  hard: "badge-error",
};

const difficultyStrip: Record<string, string> = {
  easy: "bg-success",
  medium: "bg-warning",
  hard: "bg-error",
};

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* Color strip based on difficulty */}
      <div className={`h-1.5 w-full ${difficultyStrip[recipe.difficulty] ?? "bg-base-300"}`} />

      <div className="card-body p-4 flex flex-col gap-2">
        <h3 className="card-title text-base">{recipe.title}</h3>

        {recipe.description && (
          <p className="text-sm text-base-content/60 line-clamp-2 leading-snug">
            {recipe.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 items-center text-sm">
          <span className={`badge badge-sm ${difficultyBadge[recipe.difficulty] ?? "badge-ghost"}`}>
            {difficultyLabels[recipe.difficulty] ?? recipe.difficulty}
          </span>

          <span className="text-base-content/50">⏱ {recipe.preparation_time} perc</span>

          {recipe.rating_count > 0 && (
            <span className="text-warning">
              ⭐ {recipe.average_rating.toFixed(1)} ({recipe.rating_count})
            </span>
          )}
        </div>

        <div className="text-xs text-base-content/40">{recipe.author.username}</div>
      </div>
    </div>
  );
}
