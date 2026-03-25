"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
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
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/pages/recipe/${recipe.id}`)}
      className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
    >
      <div className={`h-1.5 w-full ${difficultyStrip[recipe.difficulty] ?? "bg-base-300"}`} />

      {recipe.image_url ? (
        <figure className="h-40 overflow-hidden">
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </figure>
      ) : (
        <div className="h-40 bg-base-300 flex items-center justify-center text-4xl text-base-content/20">
          🍽️
        </div>
      )}

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

        <Link
          href={`/pages/user/${recipe.author.id}`}
          className="flex items-center gap-1.5 text-xs text-base-content/40 hover:text-primary transition-colors w-fit"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="avatar placeholder">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-content flex items-center justify-center text-[10px]">
              {recipe.author.profile_image_url ? (
                <img src={recipe.author.profile_image_url} alt={recipe.author.username} className="rounded-full" />
              ) : (
                recipe.author.username.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          {recipe.author.username}
        </Link>
      </div>
    </div>
  );
}
