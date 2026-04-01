import { Suspense } from "react";
import Navbar from "./components/Navbar";
import RecipeList from "./components/RecipeList";
import NewRecipeButton from "./components/NewRecipeButton";

export default function Page() {
  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="text-center py-12 px-5">
        <h1 className="text-4xl font-bold">🍴 ForkFeed</h1>
        <p className="mt-2 text-base-content/60 text-base">
          Fedezd fel a közösség legjobb receptjeit
        </p>
        <NewRecipeButton />
      </div>

      <div className="max-w-6xl mx-auto px-5 pb-12">
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <span className="loading loading-spinner loading-lg" />
            </div>
          }
        >
          <RecipeList />
        </Suspense>
      </div>
    </div>
  );
}
