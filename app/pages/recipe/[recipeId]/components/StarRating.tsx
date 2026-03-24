"use client";

import { useState } from "react";

type Props = {
  myRating: number | null;
  onRate: (value: number) => void;
  onDelete: () => void;
  isLoggedIn: boolean;
};

export default function StarRating({ myRating, onRate, onDelete, isLoggedIn }: Props) {
  const [hoverRating, setHoverRating] = useState(0);

  function starColor(star: number) {
    const isHovering = hoverRating > 0;

    if (isHovering) {
      if (star <= hoverRating) return "text-warning";
      if (myRating && star <= myRating) return "text-warning/30";
      return "text-base-content/20";
    }

    if (myRating && star <= myRating) return "text-warning";
    return "text-base-content/20";
  }

  return (
    <section id="rating-section" className="scroll-mt-4">
      <h2 className="text-xl font-bold mb-1">🏅 Az én értékelésem</h2>
      <p className="text-sm text-base-content/50 mb-3">
        {!isLoggedIn
          ? "Jelentkezz be az értékeléshez."
          : myRating != null
            ? "Kattints a csillagokra az értékelésed módosításához."
            : "Kattints a csillagokra az értékeléshez."}
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!isLoggedIn}
            onMouseEnter={() => isLoggedIn && setHoverRating(star)}
            onMouseLeave={() => isLoggedIn && setHoverRating(0)}
            onClick={() => isLoggedIn && onRate(star)}
            className={`text-3xl leading-none ${isLoggedIn ? "transition-transform hover:scale-110 cursor-pointer" : "cursor-not-allowed opacity-50"}`}
          >
            <span className={`transition-colors ${starColor(star)}`}>★</span>
          </button>
        ))}
        {myRating != null && (
          <>
            <span className="ml-3 text-sm text-base-content/50">Az értékelésed: {myRating}/5</span>
            <button
              type="button"
              onClick={onDelete}
              className="btn btn-xs btn-ghost text-error ml-2"
            >
              ✕ Törlés
            </button>
          </>
        )}
      </div>
    </section>
  );
}
