import Link from "next/link";

type RecipeBook = {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  recipe_count: number;
  created_at: string;
};

type Props = {
  book: RecipeBook;
  onDelete: (id: number) => void;
};

export default function RecipeBookCard({ book, onDelete }: Props) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/pages/profile/recipe-books/${book.id}`}
            className="card-title text-base hover:text-primary transition-colors"
          >
            📖 {book.name}
          </Link>
          <span
            className={`badge badge-sm shrink-0 ${book.is_public ? "badge-success" : "badge-ghost"}`}
          >
            {book.is_public ? "Publikus" : "Privát"}
          </span>
        </div>

        {book.description && (
          <p className="text-sm text-base-content/60 line-clamp-2">{book.description}</p>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-base-content/50">
          <span>🍽️ {book.recipe_count} recept</span>
          <span>{new Date(book.created_at).toLocaleDateString("hu-HU")}</span>
        </div>

        <div className="flex gap-2 mt-2">
          <Link
            href={`/pages/profile/recipe-books/${book.id}`}
            className="btn btn-sm btn-outline btn-primary flex-1"
          >
            Megnyitás
          </Link>
          <button className="btn btn-sm btn-outline btn-error" onClick={() => onDelete(book.id)}>
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
