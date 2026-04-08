"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const ThemeToggle = dynamic(() => import("../../pages/main/components/ThemeToggle"), {
  ssr: false,
});

type User = {
  id: number;
  username: string;
  role: string;
  profile_image_url?: string | null;
};

const sidebarLinks = [
  {
    href: "/pages/admin",
    label: "Áttekintés",
    icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
    exact: true,
  },
  {
    href: "/pages/admin/reports",
    label: "Jelentések",
    icon: "M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5",
  },
  {
    href: "/pages/admin/users",
    label: "Felhasználók",
    icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/pages/login");
      return;
    }

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.user?.role !== "admin") {
          router.replace("/pages/main");
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.replace("/pages/login"))
      .finally(() => setLoading(false));
  }, [router]);

  function isActive(link: (typeof sidebarLinks)[number]) {
    if (link.exact) return pathname === link.href;
    return pathname === link.href || pathname.startsWith(link.href + "/");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-base-100 border-r border-base-300 min-h-screen sticky top-0">
        <div className="p-5 border-b border-base-300">
          <Link
            href="/pages/main"
            className="text-xl font-bold text-primary flex items-center gap-2"
          >
            🍴 ForkFeed
          </Link>
          <div className="text-xs text-base-content/40 mt-1">Admin panel</div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link)
                  ? "bg-primary text-primary-content"
                  : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 shrink-0"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
              </svg>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-base-300 flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/pages/profile"
            className="btn btn-ghost btn-sm flex-1 justify-start gap-2 text-xs"
          >
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-6 h-6">
                {user.profile_image_url ? (
                  <img
                    src={user.profile_image_url}
                    alt={user.username}
                    className="rounded-full"
                  />
                ) : (
                  <span className="text-[10px] font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <span className="truncate">{user.username}</span>
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-base-100 border-b border-base-300 px-4 h-14 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="btn btn-ghost btn-sm btn-square">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <span className="font-bold text-primary">🍴 Admin</span>
        <ThemeToggle />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-base-100 z-50 flex flex-col shadow-xl">
            <div className="p-5 border-b border-base-300 flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-primary">🍴 ForkFeed</div>
                <div className="text-xs text-base-content/40 mt-0.5">Admin panel</div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="btn btn-ghost btn-sm btn-square"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 p-3 flex flex-col gap-1">
              {sidebarLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link)
                      ? "bg-primary text-primary-content"
                      : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 shrink-0"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                  </svg>
                  {link.label}
                </Link>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:pt-0 pt-14">{children}</main>
    </div>
  );
}
