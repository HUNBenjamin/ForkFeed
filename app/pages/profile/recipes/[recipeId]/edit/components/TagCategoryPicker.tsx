import { useEffect, useState } from "react";
import type { Category, Tag } from "../types";

type Props = {
  selectedCategoryIds: number[];
  selectedTagIds: number[];
  onChangeCategories: (ids: number[]) => void;
  onChangeTags: (ids: number[]) => void;
};

export default function TagCategoryPicker({
  selectedCategoryIds,
  selectedTagIds,
  onChangeCategories,
  onChangeTags,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  const toggleCategory = (id: number) => {
    onChangeCategories(
      selectedCategoryIds.includes(id)
        ? selectedCategoryIds.filter((c) => c !== id)
        : [...selectedCategoryIds, id],
    );
  };

  const toggleTag = (id: number) => {
    onChangeTags(
      selectedTagIds.includes(id)
        ? selectedTagIds.filter((t) => t !== id)
        : [...selectedTagIds, id],
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="label">
          <span className="label-text font-semibold">📂 Kategóriák</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`badge badge-lg cursor-pointer ${
                selectedCategoryIds.includes(c.id) ? "badge-primary" : "badge-outline"
              }`}
              onClick={() => toggleCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
          {categories.length === 0 && (
            <span className="text-sm text-base-content/40">Nincsenek kategóriák.</span>
          )}
        </div>
      </div>

      <div>
        <label className="label">
          <span className="label-text font-semibold">🏷️ Címkék</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`badge badge-lg cursor-pointer ${
                selectedTagIds.includes(t.id) ? "badge-secondary" : "badge-outline"
              }`}
              onClick={() => toggleTag(t.id)}
            >
              #{t.name}
            </button>
          ))}
          {tags.length === 0 && (
            <span className="text-sm text-base-content/40">Nincsenek címkék.</span>
          )}
        </div>
      </div>
    </div>
  );
}
