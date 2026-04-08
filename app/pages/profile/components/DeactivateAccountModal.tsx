"use client";
import React, { useState } from "react";

type Props = {
  onClose: () => void;
  onDeactivated: () => void;
};

export default function DeactivateAccountModal({ onClose, onDeactivated }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    setError(null);
    if (!password.trim()) {
      setError("Add meg a jelszavad.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/users/me/deactivate", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 403) {
          setError("Hibás jelszó.");
        } else {
          setError(data?.error ?? "Nem sikerült deaktiválni a fiókot.");
        }
        return;
      }

      localStorage.removeItem("token");
      onDeactivated();
    } catch {
      setError("Hálózati hiba történt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-sm">
        <h3 className="font-bold text-lg text-error">Fiók deaktiválása</h3>

        <div className="mt-4 space-y-3">
          <div className="alert alert-warning text-sm py-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <span>
              A fiókod deaktiválása után nem tudsz bejelentkezni. Ez a művelet visszafordítható egy
              admin által.
            </span>
          </div>

          <p className="text-sm text-base-content/70">
            A megerősítéshez add meg a jelszavad:
          </p>

          <input
            type="password"
            className="input input-bordered w-full"
            placeholder="Jelszó"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && password.trim()) handleDeactivate();
            }}
            autoFocus
          />

          {error && (
            <div className="alert alert-error text-sm py-2">
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Mégse
          </button>
          <button
            className="btn btn-error"
            onClick={handleDeactivate}
            disabled={!password.trim() || loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Fiók deaktiválása"
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
