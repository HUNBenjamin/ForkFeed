import Link from "next/link";

type Ingredient = {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
};

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  preparation_time: number;
  difficulty: string;
  average_rating: number;
  rating_count: number;
  ingredients?: Ingredient[];
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
    <Link
      href={`/pages/recipe/${recipe.id}`}
      className="block relative w-full h-64 rounded-xl overflow-hidden shadow-lg ring-1 ring-base-content/10 group cursor-pointer select-none"
    >
      {/* Background image */}
      {recipe.image_url ? (
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-base-300 to-secondary/20" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/80" />

      {/* Top: title + badge + metadata (visible as peek) */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg leading-snug drop-shadow-md line-clamp-1">
            {recipe.title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-white/70 mt-1">
            <span className="drop-shadow">⏱ {recipe.preparation_time} perc</span>
            {recipe.rating_count > 0 && (
              <span className="text-yellow-300 drop-shadow">
                ⭐ {recipe.average_rating.toFixed(1)}{" "}
                <span className="text-white/50">({recipe.rating_count})</span>
              </span>
            )}
          </div>
        </div>
        <span
          className={`badge badge-sm shrink-0 shadow ${difficultyBadge[recipe.difficulty] ?? "badge-ghost"}`}
        >
          {difficultyLabels[recipe.difficulty] ?? recipe.difficulty}
        </span>
      </div>

      {/* Bottom: description + ingredients + author (revealed when card expands) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2">
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.ingredients.slice(0, 8).map((ing) => (
              <span
                key={ing.id}
                className="badge badge-sm bg-white/15 border-white/20 text-white/90 backdrop-blur-sm"
              >
                {ing.quantity != null && ing.unit
                  ? `${ing.quantity} ${ing.unit} ${ing.name}`
                  : ing.name}
              </span>
            ))}
            {recipe.ingredients.length > 8 && (
              <span className="badge badge-sm bg-white/10 border-white/15 text-white/60">
                +{recipe.ingredients.length - 8}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center overflow-hidden text-[10px] text-white shrink-0">
              {recipe.author.profile_image_url ? (
                <img
                  src={recipe.author.profile_image_url}
                  alt={recipe.author.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                recipe.author.username.charAt(0).toUpperCase()
              )}
            </div>
            <span className="drop-shadow">{recipe.author.username}</span>
          </div>
          {onRemove && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(recipe.id);
              }}
              className="btn btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            >
              Eltávolítás
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
