"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Comment, CurrentUser } from "./comments/commentTypes";
import { getToken, authHeaders } from "./comments/commentTypes";
import CommentForm from "./comments/CommentForm";
import CommentCard from "./comments/CommentCard";
import CommentPagination from "./comments/CommentPagination";

type Props = {
  recipeId: string;
};

export default function CommentSection({ recipeId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [highlightOwn, setHighlightOwn] = useState(false);
  const scrolledRef = useRef(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser({
            id: data.user.id,
            username: data.user.username,
            profile_image_url: data.user.profile_image_url,
            role: data.user.role,
          });
        }
      })
      .catch(() => {});
  }, []);

  const fetchComments = useCallback(
    async (p: number = page) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/recipes/${recipeId}/comments?page=${p}&limit=20&order=desc`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments);
          setTotalPages(data.pagination.total_pages);
          setPage(data.pagination.page);
        }
      } catch {
        void 0;
      } finally {
        setLoading(false);
      }
    },
    [recipeId, page],
  );

  useEffect(() => {
    fetchComments(1);
  }, [recipeId]);

  const hasCommented = comments.some((c) => c.user.id === currentUser?.id);

  useEffect(() => {
    if (scrolledRef.current) return;
    if (loading || !currentUser || comments.length === 0) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#my-comment") return;

    const el = document.getElementById("my-comment");
    if (!el) return;

    scrolledRef.current = true;
    setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightOwn(true);
      setTimeout(() => setHighlightOwn(false), 2000);
    }, 100);
  }, [loading, currentUser, comments]);

  const handleSubmit = async (content: string) => {
    const token = getToken();
    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/recipes/${recipeId}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        await fetchComments(1);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Nem sikerült elküldeni a hozzászólást.");
      }
    } catch {
      setError("Hálózati hiba történt.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: number, content: string) => {
    const token = getToken();
    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        await fetchComments(page);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Nem sikerült szerkeszteni a hozzászólást.");
      }
    } catch {
      setError("Hálózati hiba történt.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    const token = getToken();
    if (!token) return;

    setError(null);

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchComments(page);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Nem sikerült törölni a hozzászólást.");
      }
    } catch {
      setError("Hálózati hiba történt.");
    }
  };

  return (
    <section id="comments-section" className="scroll-mt-4">
      <h2 className="text-xl font-bold mb-4">💬 Hozzászólások</h2>

      {currentUser && !hasCommented && !showForm && (
        <button className="btn btn-primary btn-sm mb-4" onClick={() => setShowForm(true)}>
          ✍️ Hozzászólás írása
        </button>
      )}

      {currentUser && !hasCommented && showForm && (
        <CommentForm
          currentUser={currentUser}
          submitting={submitting}
          onSubmit={(content) => {
            handleSubmit(content).then(() => setShowForm(false));
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {currentUser && hasCommented && (
        <div className="alert alert-info mb-4 text-sm">
          <span>
            Már hozzászóltál ehhez a recepthez. Szerkesztheted vagy törölheted a hozzászólásod.
          </span>
        </div>
      )}

      {!currentUser && !loading && (
        <div className="alert mb-4 text-sm">
          <span>Jelentkezz be a hozzászóláshoz.</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error mb-4 text-sm">
          <span>{error}</span>
        </div>
      )}

      {loading && comments.length === 0 ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-base-content/40 text-sm">
          Még nincsenek hozzászólások. Légy te az első!
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              currentUser={currentUser}
              submitting={submitting}
              highlight={highlightOwn && c.user.id === currentUser?.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          <CommentPagination page={page} totalPages={totalPages} onPageChange={fetchComments} />
        </div>
      )}
    </section>
  );
}
