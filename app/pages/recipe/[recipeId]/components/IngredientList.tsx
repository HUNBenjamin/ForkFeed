type Ingredient = {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
};

type Props = {
  ingredients: Ingredient[];
};

export default function IngredientList({ ingredients }: Props) {
  if (ingredients.length === 0) return null;

  return (
    <section id="ingredients-section" className="scroll-mt-4 bg-base-200 rounded-xl p-5">
      <h2 className="text-xl font-bold mb-3">🧾 Hozzávalók</h2>
      <ul className="space-y-2">
        {ingredients.map((ing) => (
          <li key={ing.id} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span>
              {ing.quantity != null && (
                <strong className="mr-1">
                  {ing.quantity}
                  {ing.unit ? ` ${ing.unit}` : ""}
                </strong>
              )}
              {ing.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
