"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Pagination from "@/app/components/Pagination";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  profile_image_url: string | null;
  created_at: string;
  last_login: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const getHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {};
  };

  const fetchUsers = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "20" });
        if (query.trim()) params.set("query", query.trim());
        if (roleFilter) params.set("role", roleFilter);
        if (activeFilter) params.set("is_active", activeFilter);

        const res = await fetch(`/api/admin/users?${params}`, { headers: getHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data.users);
        setPage(data.pagination.page);
        setTotalPages(data.pagination.total_pages);
      } finally {
        setLoading(false);
      }
    },
    [query, roleFilter, activeFilter],
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const updateUser = async (userId: number, updates: { role?: string; is_active?: boolean }) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await fetchUsers(page);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Felhasználók</h1>
        <p className="text-sm text-base-content/50 mt-1">Felhasználók kezelése és moderálása</p>
      </div>

      {/* Search & filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Keresés (név, email)..."
          className="input input-sm input-bordered w-64"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="select select-sm select-bordered"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Minden szerep</option>
          <option value="user">Felhasználó</option>
          <option value="admin">Admin</option>
        </select>
        <select
          className="select select-sm select-bordered"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">Minden státusz</option>
          <option value="true">Aktív</option>
          <option value="false">Inaktív</option>
        </select>
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-base-content/50">
          Nincs találat.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Felhasználó</th>
                  <th>Email</th>
                  <th>Szerep</th>
                  <th>Státusz</th>
                  <th>Regisztráció</th>
                  <th>Utolsó belépés</th>
                  <th>Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isLoading = actionLoading === u.id;

                  return (
                    <tr key={u.id} className="hover">
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar placeholder">
                            <div className="bg-primary text-primary-content rounded-full w-8 h-8">
                              {u.profile_image_url ? (
                                <img
                                  src={u.profile_image_url}
                                  alt={u.username}
                                  className="rounded-full"
                                />
                              ) : (
                                <span className="text-xs font-bold">
                                  {u.username.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <Link
                              href={`/pages/user/${u.id}`}
                              className="font-medium link link-hover text-sm"
                            >
                              {u.username}
                            </Link>
                            <div className="text-xs text-base-content/40">#{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm">{u.email}</td>
                      <td>
                        <span
                          className={`badge badge-sm ${u.role === "admin" ? "badge-primary" : "badge-ghost"}`}
                        >
                          {u.role === "admin" ? "Admin" : "User"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm ${u.is_active ? "badge-success" : "badge-error"}`}
                        >
                          {u.is_active ? "Aktív" : "Inaktív"}
                        </span>
                      </td>
                      <td className="text-xs text-base-content/50">
                        {new Date(u.created_at).toLocaleDateString("hu-HU")}
                      </td>
                      <td className="text-xs text-base-content/50">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleDateString("hu-HU")
                          : "–"}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {/* Toggle role */}
                          <div className="dropdown dropdown-end">
                            <label
                              tabIndex={0}
                              className="btn btn-ghost btn-xs"
                              title="Szerep módosítása"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-4 h-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                            </label>
                            <ul
                              tabIndex={0}
                              className="dropdown-content z-[1] menu p-1 shadow-lg bg-base-100 rounded-lg w-40 border border-base-300"
                            >
                              <li>
                                <button
                                  disabled={isLoading || u.role === "user"}
                                  onClick={() => updateUser(u.id, { role: "user" })}
                                  className="text-sm"
                                >
                                  Felhasználó
                                </button>
                              </li>
                              <li>
                                <button
                                  disabled={isLoading || u.role === "admin"}
                                  onClick={() => {
                                    if (confirm(`Biztosan admin jogot adsz ${u.username}-nek?`)) {
                                      updateUser(u.id, { role: "admin" });
                                    }
                                  }}
                                  className="text-sm"
                                >
                                  Admin
                                </button>
                              </li>
                            </ul>
                          </div>

                          {/* Toggle active */}
                          <button
                            className={`btn btn-ghost btn-xs ${!u.is_active ? "text-success" : "text-error"}`}
                            title={u.is_active ? "Felhasználó tiltása" : "Felhasználó aktiválása"}
                            disabled={isLoading}
                            onClick={() => {
                              const action = u.is_active ? "tiltod" : "aktiválod";
                              if (confirm(`Biztosan ${action} ${u.username}-t?`)) {
                                updateUser(u.id, { is_active: !u.is_active });
                              }
                            }}
                          >
                            {isLoading ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : u.is_active ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-4 h-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-4 h-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={fetchUsers} />
          )}
        </>
      )}
    </div>
  );
}
