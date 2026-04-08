import Link from "next/link";

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

type Props = {
  recipe: Recipe;
  onRemove?: (recipeId: number) => void;
};

export default function BookRecipeCard({ recipe, onRemove }: Props) {
  return (
    <div className="card bg-base-100 shadow-md overflow-hidden">
      {recipe.image_url ? (
        <Link href={`/pages/recipe/${recipe.id}`}>
          <figure className="h-36 overflow-hidden">
            <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
          </figure>
        </Link>
      ) : (
        <Link
          href={`/pages/recipe/${recipe.id}`}
          className="h-36 bg-base-300 flex items-center justify-center text-4xl text-base-content/20"
        >
          🍽️
        </Link>
      )}

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
          {recipe.rating_count > 0 && (
            <span className="text-warning">
              ⭐ {recipe.average_rating.toFixed(1)} ({recipe.rating_count})
            </span>
          )}
        </div>

        <Link
          href={`/pages/user/${recipe.author.id}`}
          className="flex items-center gap-1.5 text-xs text-base-content/40 hover:text-primary transition-colors w-fit"
        >
          <div className="avatar placeholder">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-content flex items-center justify-center text-[10px]">
              {recipe.author.profile_image_url ? (
                <img
                  src={recipe.author.profile_image_url}
                  alt={recipe.author.username}
                  className="rounded-full"
                />
              ) : (
                recipe.author.username.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          {recipe.author.username}
        </Link>

        {onRemove && (
          <button
            className="btn btn-sm btn-outline btn-error mt-1"
            onClick={() => onRemove(recipe.id)}
          >
            Eltávolítás
          </button>
        )}
      </div>
    </div>
  );
}
