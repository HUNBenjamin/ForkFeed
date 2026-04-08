"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../main/components/Navbar";
import ProfileTabs from "../components/ProfileTabs";
import RecipeBookCard from "./components/RecipeBookCard";
import CreateBookModal from "./components/CreateBookModal";
import Pagination from "@/app/components/Pagination";

type RecipeBook = {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  recipe_count: number;
  created_at: string;
};

export default function MyRecipeBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<RecipeBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchBooks = async (p: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/pages/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/recipe-books?scope=mine&page=${p}&limit=12`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/pages/login");
          return;
        }
        throw new Error("Nem sikerült betölteni a receptfüzeteket.");
      }
      const data = await res.json();
      setBooks(data.recipe_books);
      setTotalPages(data.pagination.total_pages);
      setPage(data.pagination.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks(1);
  }, []);

  const handleDelete = async (bookId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const confirmed = window.confirm("Biztosan törölni szeretnéd ezt a receptfüzetet?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/recipe-books/${bookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchBooks(page);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Nem sikerült törölni a receptfüzetet.");
      }
    } catch {
      setError("Hálózati hiba történt.");
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />
      <ProfileTabs />

      <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-end">
          <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
            + Új receptkönyv
          </button>
        </div>

        {error && (
          <div className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-base-content/50 text-lg">Még nincsenek receptfüzeteid.</p>
            <button className="btn btn-primary mt-4" onClick={() => setCreateOpen(true)}>
              Hozd létre az elsőt!
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((b) => (
                <RecipeBookCard key={b.id} book={b} onDelete={handleDelete} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onPageChange={fetchBooks} />
            )}
          </>
        )}
      </div>

      <CreateBookModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          fetchBooks(1);
        }}
      />
    </div>
  );
}
