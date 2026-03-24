import type { Ingredient } from "../types";

type Props = {
  ingredients: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
};

export default function IngredientsEditor({ ingredients, onChange }: Props) {
  const update = (index: number, field: keyof Ingredient, value: string | number | null) => {
    const copy = [...ingredients];
    copy[index] = { ...copy[index], [field]: value };
    onChange(copy);
  };

  const add = () => {
    onChange([...ingredients, { name: "", quantity: null, unit: null }]);
  };

  const remove = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="label">
        <span className="label-text font-semibold">🧾 Hozzávalók</span>
      </label>

      {ingredients.map((ing, i) => (
        <div key={i} className="flex gap-2 items-start">
          <input
            type="text"
            className="input input-bordered input-sm flex-1"
            placeholder="Név"
            value={ing.name}
            onChange={(e) => update(i, "name", e.target.value)}
          />
          <input
            type="number"
            className="input input-bordered input-sm w-20"
            placeholder="Menny."
            value={ing.quantity ?? ""}
            onChange={(e) => update(i, "quantity", e.target.value ? Number(e.target.value) : null)}
          />
          <input
            type="text"
            className="input input-bordered input-sm w-20"
            placeholder="Egység"
            value={ing.unit ?? ""}
            onChange={(e) => update(i, "unit", e.target.value || null)}
          />
          <button className="btn btn-ghost btn-sm text-error" onClick={() => remove(i)}>
            ✕
          </button>
        </div>
      ))}

      <button className="btn btn-ghost btn-sm self-start" onClick={add}>
        + Hozzávaló hozzáadása
      </button>
    </div>
  );
}
