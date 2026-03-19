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

type Category = { id: number; name: string };

type Props = {
  difficulty: string;
  categories: Category[];
};

export default function BadgeRow({ difficulty, categories }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="badge badge-primary badge-outline">Recept</span>
      <span className={`badge ${difficultyBadge[difficulty] ?? "badge-ghost"}`}>
        {difficultyLabels[difficulty] ?? difficulty}
      </span>
      {categories.map((c) => (
        <span key={c.id} className="badge badge-outline badge-secondary badge-sm">
          {c.name}
        </span>
      ))}
    </div>
  );
}
