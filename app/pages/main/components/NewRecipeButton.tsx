"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function NewRecipeButton() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) setLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  if (!loggedIn) {
    return (
      <div className="tooltip tooltip-bottom" data-tip="Jelentkezz be a recept feltöltéséhez">
        <button className="btn btn-primary mt-4 btn-disabled" tabIndex={-1}>
          📤 Recept feltöltése
        </button>
      </div>
    );
  }

  return (
    <Link href="/pages/recipe/new" className="btn btn-primary mt-4">
      📤 Recept feltöltése
    </Link>
  );
}
