import Link from "next/link";

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  preparation_time: number;
  difficulty: string;
  average_rating: number;
  rating_count: number;
  created_at: string;
  my_rating: number | null;
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

type Props = {
  recipe: Recipe;
};

export default function RatedRecipeCard({ recipe }: Props) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/pages/recipe/${recipe.id}`}
            className="card-title text-base hover:text-primary transition-colors"
          >
            {recipe.title}
          </Link>
          <span
            className={`badge badge-sm shrink-0 ${difficultyBadge[recipe.difficulty] ?? "badge-ghost"}`}
          >
            {difficultyLabels[recipe.difficulty] ?? recipe.difficulty}
          </span>
        </div>

        {recipe.description && (
          <p className="text-sm text-base-content/60 line-clamp-2">{recipe.description}</p>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-base-content/50">
          <span>⏱ {recipe.preparation_time} perc</span>
          {recipe.my_rating && (
            <span className="text-warning font-medium">
              Saját: {"⭐".repeat(recipe.my_rating)}
            </span>
          )}
          {recipe.rating_count > 0 && (
            <span className="text-base-content/40">
              Átlag: {recipe.average_rating.toFixed(1)} ({recipe.rating_count})
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-base-content/50">
          <span>{new Date(recipe.created_at).toLocaleDateString("hu-HU")}</span>
        </div>

        <div className="mt-2">
          <Link
            href={`/pages/recipe/${recipe.id}`}
            className="btn btn-sm btn-outline btn-primary w-full"
          >
            ⭐ Megtekintés
          </Link>
        </div>
      </div>
    </div>
  );
}
