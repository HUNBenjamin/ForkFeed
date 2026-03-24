export type Ingredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

export type Step = {
  step_number: number;
  description: string;
};

export type Category = { id: number; name: string };
export type Tag = { id: number; name: string };

export type RecipeForm = {
  title: string;
  description: string;
  preparation_time: number;
  difficulty: string;
  ingredients: Ingredient[];
  steps: Step[];
  category_ids: number[];
  tag_ids: number[];
};

export const difficultyLabels: Record<string, string> = {
  easy: "Könnyű",
  medium: "Közepes",
  hard: "Nehéz",
};
