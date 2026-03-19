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
  const [menuOpen, setMenuOpen] = useState(false);

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

      {/* Desktop nav */}
      <div className="flex-none hidden md:flex items-center gap-3">
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

      {/* Mobile hamburger */}
      <div className="flex-none md:hidden flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="btn btn-ghost btn-square"
          aria-label="Menü"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-base-100 shadow-md z-50 md:hidden border-t border-base-300">
          <div className="flex flex-col gap-2 p-4">
            {user ? (
              <>
                <span className="text-sm text-center">
                  Szia, <strong>{user.username}</strong>!
                </span>
                <Link
                  href="/pages/profile"
                  onClick={() => setMenuOpen(false)}
                  className="btn btn-sm btn-ghost"
                >
                  Profilom
                </Link>
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="btn btn-sm btn-outline"
                >
                  Kijelentkezés
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/pages/login"
                  onClick={() => setMenuOpen(false)}
                  className="btn btn-sm btn-primary"
                >
                  Bejelentkezés
                </Link>
                <Link
                  href="/pages/register"
                  onClick={() => setMenuOpen(false)}
                  className="btn btn-sm btn-outline btn-primary"
                >
                  Regisztráció
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
