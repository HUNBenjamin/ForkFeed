"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  pendingReports: number;
  totalReports: number;
  totalUsers: number;
  activeUsers: number;
};

type RecentReport = {
  id: number;
  target_type: string;
  target_id: number;
  reason: string;
  status: string;
  created_at: string;
  reporter: { id: number; username: string };
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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/admin/reports?status=pending&limit=1", { headers }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/admin/reports?limit=1", { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/users?limit=1", { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/users?is_active=true&limit=1", { headers }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/admin/reports?limit=5", { headers }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([pending, allReports, allUsers, activeUsers, recent]) => {
        setStats({
          pendingReports: pending?.pagination?.total ?? 0,
          totalReports: allReports?.pagination?.total ?? 0,
          totalUsers: allUsers?.pagination?.total ?? 0,
          activeUsers: activeUsers?.pagination?.total ?? 0,
        });
        setRecentReports(recent?.reports ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Áttekintés</h1>
        <p className="text-sm text-base-content/50 mt-1">Admin vezérlőpult</p>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/pages/admin/reports?status=pending"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="card-body p-4">
              <div className="text-3xl font-bold text-warning">{stats.pendingReports}</div>
              <div className="text-sm text-base-content/60">Függő jelentések</div>
            </div>
          </Link>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="text-3xl font-bold text-primary">{stats.totalReports}</div>
              <div className="text-sm text-base-content/60">Összes jelentés</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="text-3xl font-bold text-primary">{stats.totalUsers}</div>
              <div className="text-sm text-base-content/60">Összes felhasználó</div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="text-3xl font-bold text-success">{stats.activeUsers}</div>
              <div className="text-sm text-base-content/60">Aktív felhasználó</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent reports */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h2 className="card-title text-lg">Legutóbbi jelentések</h2>
            <Link href="/pages/admin/reports" className="btn btn-ghost btn-sm text-primary">
              Összes →
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <p className="text-base-content/50 text-sm py-4 text-center">
              Nincsenek jelentések.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Típus</th>
                    <th>Indok</th>
                    <th>Bejelentő</th>
                    <th>Státusz</th>
                    <th>Dátum</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((r) => (
                    <tr key={r.id} className="hover">
                      <td>
                        <Link
                          href={`/pages/admin/reports?highlight=${r.id}`}
                          className="link link-primary font-mono text-xs"
                        >
                          #{r.id}
                        </Link>
                      </td>
                      <td>
                        <span className="badge badge-sm badge-outline">
                          {targetTypeLabels[r.target_type] ?? r.target_type}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate text-sm">{r.reason}</td>
                      <td className="text-sm">{r.reporter.username}</td>
                      <td>
                        <span className={`badge badge-sm ${statusBadge[r.status] ?? "badge-ghost"}`}>
                          {statusLabels[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="text-xs text-base-content/50">
                        {new Date(r.created_at).toLocaleDateString("hu-HU")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
