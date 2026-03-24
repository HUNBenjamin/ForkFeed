import React from "react";
import Link from "next/link";

type Stats = {
  recipes_count: number;
  comments_count: number;
  ratings_given_count: number;
  favorites_count: number;
  recipe_books_count: number;
  average_recipe_rating: number;
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-base-200 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-base-content/50 mt-1">{label}</div>
    </div>
  );
}

function ClickableStat({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="relative bg-base-200 rounded-lg p-3 text-center hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-primary/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-base-content/50 mt-1">{label}</div>
    </Link>
  );
}

export default function StatsCard({ stats }: { stats: Stats }) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-lg mb-2">Statisztikák</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ClickableStat
            label="Receptek"
            value={stats.recipes_count}
            href="/pages/profile/recipes"
          />
          <Stat label="Kommentek" value={stats.comments_count} />
          <Stat label="Értékelések" value={stats.ratings_given_count} />
          <Stat label="Kedvencek" value={stats.favorites_count} />
          <Stat label="Receptfüzetek" value={stats.recipe_books_count} />
          <Stat
            label="Átlag értékelés"
            value={
              stats.average_recipe_rating > 0 ? `⭐ ${stats.average_recipe_rating.toFixed(1)}` : "–"
            }
          />
        </div>
      </div>
    </div>
  );
}
