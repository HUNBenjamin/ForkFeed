import React from "react";
import Navbar from "./components/Navbar";
import RecipeList from "./components/RecipeList";

export default function Page() {
  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      {/* Hero */}
      <div className="text-center py-12 px-5">
        <h1 className="text-4xl font-bold">🍴 ForkFeed</h1>
        <p className="mt-2 text-base-content/60 text-base">
          Fedezd fel a közösség legjobb receptjeit
        </p>
      </div>

      {/* Recipe listing */}
      <div className="max-w-6xl mx-auto px-5 pb-12">
        <RecipeList />
      </div>
    </div>
  );
}
