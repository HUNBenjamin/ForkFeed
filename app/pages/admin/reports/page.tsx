"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Pagination from "@/app/components/Pagination";

type Report = {
  id: number;
  target_type: string;
  target_id: number;
  reason: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reporter: { id: number; username: string };
  reviewer: { id: number; username: string } | null;
  comment?: {
    content: string;
    user: { id: number; username: string };
    recipe_id: number;
    is_deleted: boolean;
  };
};

const targetTypeLabels: Record<string, string> = {
  recipe: "Recept",
  comment: "Komment",
  user: "Felhasználó",
};

const statusBadge: Record<string, string> = {
  pending: "badge-warning",
  accepted: "badge-success",
  rejected: "badge-ghost",
};

const statusLabels: Record<string, string> = {
  pending: "Függőben",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
};

function getTargetLink(type: string, id: number): string | null {
  switch (type) {
    case "recipe":
      return `/pages/recipe/${id}`;
    case "user":
      return `/pages/user/${id}`;
    default:
      return null;
  }
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {};
  };

  const fetchReports = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "20" });
        if (statusFilter) params.set("status", statusFilter);
        if (typeFilter) params.set("target_type", typeFilter);

        const res = await fetch(`/api/admin/reports?${params}`, { headers: getHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setReports(data.reports);
        setPage(data.pagination.page);
        setTotalPages(data.pagination.total_pages);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, typeFilter],
  );

  useEffect(() => {
    fetchReports(1);
  }, [fetchReports]);

  const updateStatus = async (reportId: number, status: string) => {
    setActionLoading(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchReports(page);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const executeAction = async (reportId: number, action: string) => {
    setActionLoading(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/actions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchReports(page);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Jelentések</h1>
        <p className="text-sm text-base-content/50 mt-1">Felhasználói bejelentések kezelése</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="select select-sm select-bordered"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Minden státusz</option>
          <option value="pending">Függőben</option>
          <option value="accepted">Elfogadva</option>
          <option value="rejected">Elutasítva</option>
        </select>
        <select
          className="select select-sm select-bordered"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Minden típus</option>
          <option value="recipe">Recept</option>
          <option value="comment">Komment</option>
          <option value="user">Felhasználó</option>
        </select>
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-base-content/50">
          Nincs találat a szűrőknek megfelelően.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => {
            const targetLink = getTargetLink(r.target_type, r.target_id);
            const isExpanded = expandedId === r.id;
            const isPending = r.status === "pending";
            const isLoading = actionLoading === r.id;

            return (
              <div
                key={r.id}
                className={`card bg-base-100 shadow-sm border-l-4 ${
                  isPending
                    ? "border-l-warning"
                    : r.status === "accepted"
                      ? "border-l-success"
                      : "border-l-base-300"
                }`}
              >
                <div className="card-body p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-base-content/40">#{r.id}</span>
                        <span className={`badge badge-sm ${statusBadge[r.status]}`}>
                          {statusLabels[r.status]}
                        </span>
                        <span className="badge badge-sm badge-outline">
                          {targetTypeLabels[r.target_type] ?? r.target_type}
                        </span>
                        {targetLink && (
                          <Link
                            href={targetLink}
                            className="text-xs link link-primary"
                            target="_blank"
                          >
                            #{r.target_id} megtekintése ↗
                          </Link>
                        )}
                        {r.target_type === "comment" && (
                          <Link
                            href={r.comment ? `/pages/recipe/${r.comment.recipe_id}` : "#"}
                            className="text-xs link link-primary"
                            target="_blank"
                          >
                            Komment #{r.target_id} megtekintése ↗
                          </Link>
                        )}
                      </div>

                      {/* Comment content preview */}
                      {r.target_type === "comment" && r.comment && (
                        <div
                          className={`mt-2 p-3 rounded-lg text-sm ${r.comment.is_deleted ? "bg-error/10 border border-error/20" : "bg-base-200"}`}
                        >
                          <div className="flex items-center gap-1.5 text-xs text-base-content/50 mb-1">
                            <Link
                              href={`/pages/user/${r.comment.user.id}`}
                              className="link link-hover font-medium"
                            >
                              {r.comment.user.username}
                            </Link>
                            {r.comment.is_deleted && (
                              <span className="badge badge-xs badge-error">Törölve</span>
                            )}
                          </div>
                          <p className="text-base-content/70 italic">
                            &ldquo;{r.comment.content}&rdquo;
                          </p>
                        </div>
                      )}
                      <p className="text-sm mt-1.5">{r.reason}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-base-content/40">
                        <span>
                          Bejelentő:{" "}
                          <Link href={`/pages/user/${r.reporter.id}`} className="link link-hover">
                            {r.reporter.username}
                          </Link>
                        </span>
                        <span>{new Date(r.created_at).toLocaleString("hu-HU")}</span>
                        {r.reviewer && <span>Elbírálta: {r.reviewer.username}</span>}
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      className="btn btn-ghost btn-sm btn-square shrink-0"
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded actions */}
                  {isExpanded && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-base-200">
                      {isPending && (
                        <>
                          <button
                            className="btn btn-sm btn-success gap-1"
                            disabled={isLoading}
                            onClick={() => updateStatus(r.id, "accepted")}
                          >
                            {isLoading ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              "✓"
                            )}
                            Elfogadás
                          </button>
                          <button
                            className="btn btn-sm btn-ghost gap-1"
                            disabled={isLoading}
                            onClick={() => updateStatus(r.id, "rejected")}
                          >
                            ✕ Elutasítás
                          </button>
                        </>
                      )}
                      {r.target_type !== "user" && (
                        <button
                          className="btn btn-sm btn-error btn-outline gap-1"
                          disabled={isLoading}
                          onClick={() => {
                            if (confirm("Biztosan törlöd a bejelentett tartalmat?")) {
                              executeAction(r.id, "delete_target");
                            }
                          }}
                        >
                          🗑️ Tartalom törlése
                        </button>
                      )}
                      {r.target_type === "user" && (
                        <Link
                          href={`/pages/admin/users?highlight=${r.target_id}`}
                          className="btn btn-sm btn-outline gap-1"
                        >
                          👤 Felhasználó kezelése
                        </Link>
                      )}
                      {!isPending && (
                        <button
                          className="btn btn-sm btn-ghost gap-1"
                          disabled={isLoading}
                          onClick={() => updateStatus(r.id, "pending")}
                        >
                          ↩ Újranyitás
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={fetchReports} />
          )}
        </div>
      )}
    </div>
  );
}
