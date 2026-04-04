"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  targetType: "recipe" | "comment" | "user";
  targetId: number;
  targetLabel: string;
};

export default function ReportModal({ open, onClose, targetType, targetId, targetLabel }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token || !reason.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Nem sikerült elküldeni a jelentést.");
      }

      setResult("success");
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setResult(null);
    setError(null);
    onClose();
  };

  const typeLabels: Record<string, string> = {
    recipe: "receptet",
    comment: "kommentet",
    user: "felhasználót",
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-2">
          {targetType === "user" ? "Felhasználó" : targetType === "recipe" ? "Recept" : "Komment"}{" "}
          jelentése
        </h3>
        <p className="text-sm text-base-content/60 mb-4">
          Miért szeretnéd jelenteni ezt a {typeLabels[targetType]}:{" "}
          <span className="font-semibold">{targetLabel}</span>?
        </p>

        {result === "success" ? (
          <div className="flex flex-col gap-4">
            <div className="alert alert-success text-sm">
              <span>Jelentés sikeresen elküldve. Köszönjük!</span>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={handleClose}>
                Bezárás
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="alert alert-error text-sm mb-3">
                <span>{error}</span>
              </div>
            )}
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              maxLength={500}
              placeholder="Írd le az okot... (kötelező)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="text-xs text-base-content/40 mt-1 text-right">{reason.length}/500</div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={handleClose} disabled={loading}>
                Mégse
              </button>
              <button
                className="btn btn-error"
                disabled={loading || !reason.trim()}
                onClick={handleSubmit}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "🚩 Jelentés küldése"
                )}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </div>
  );
}
