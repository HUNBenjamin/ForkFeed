"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const ThemeToggle = dynamic(() => import("./ThemeToggle"), { ssr: false });

type User = {
  id: number;
  username: string;
};

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    const token = localStorage.getItem("token");
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <div className="navbar bg-base-100 shadow-sm px-4">
      <div className="flex-1">
        <Link href="/pages/main" className="text-xl font-bold text-primary">
          🍴 ForkFeed
        </Link>
      </div>

      <div className="flex-none flex items-center gap-3">
        <ThemeToggle />
        {user ? (
          <>
            <Link href="/pages/profile" className="btn btn-sm btn-ghost">
              Profilom
            </Link>
            <span className="text-sm">
              Szia, <strong>{user.username}</strong>!
            </span>
            <button onClick={handleLogout} className="btn btn-sm btn-outline">
              Kijelentkezés
            </button>
          </>
        ) : (
          <>
            <Link href="/pages/login" className="btn btn-sm btn-primary">
              Bejelentkezés
            </Link>
            <Link href="/pages/register" className="btn btn-sm btn-outline btn-primary">
              Regisztráció
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
