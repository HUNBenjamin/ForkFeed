"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/pages/profile", label: "Profil", exact: true },
  { href: "/pages/profile/recipes", label: "Receptjeim" },
  { href: "/pages/profile/favorites", label: "Kedvencek" },
  { href: "/pages/profile/recipe-books", label: "Receptkönyvek" },
  { href: "/pages/profile/comments", label: "Kommentek" },
  { href: "/pages/profile/ratings", label: "Értékelések" },
];

export default function ProfileTabs() {
  const pathname = usePathname();

  function isActive(tab: (typeof tabs)[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname === tab.href || pathname.startsWith(tab.href + "/");
  }

  return (
    <div className="border-b border-base-300 bg-base-100">
      <div className="max-w-5xl mx-auto px-5">
        <div className="flex gap-1 overflow-x-auto scrollbar-none -mb-px">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive(tab)
                  ? "border-primary text-primary"
                  : "border-transparent text-base-content/60 hover:text-base-content hover:border-base-300"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
