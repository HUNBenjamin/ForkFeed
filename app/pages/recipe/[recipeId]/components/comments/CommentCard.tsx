"use client";

import { useState } from "react";
import Link from "next/link";
import UserAvatar from "../UserAvatar";
import type { Comment, CurrentUser } from "./commentTypes";
import { formatDate, getToken } from "./commentTypes";

type Props = {
  comment: Comment;
  currentUser: CurrentUser;
  submitting: boolean;
  highlight?: boolean;
  onEdit: (commentId: number, content: string) => void;
  onDelete: (commentId: number) => void;
};

export default function CommentCard({
  comment,
  currentUser,
  submitting,
  highlight,
  onEdit,
  onDelete,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState<"success" | "error" | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const isOwn = currentUser?.id === comment.user.id;
  const isAdmin = currentUser?.role === "admin";

  const startEditing = () => {
    setIsEditing(true);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleSave = () => {
    if (!editContent.trim()) return;
    onEdit(comment.id, editContent.trim());
    setIsEditing(false);
    setEditContent("");
  };

  const handleReport = async () => {
    const token = getToken();
    if (!token || !reportReason.trim()) return;

    setReportLoading(true);
    setReportError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_type: "comment",
          target_id: comment.id,
          reason: reportReason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Nem sikerült elküldeni a jelentést.");
      }

      setReportResult("success");
      setReportReason("");
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Ismeretlen hiba.");
      setReportResult("error");
    } finally {
      setReportLoading(false);
    }
  };

  const closeReport = () => {
    setReportOpen(false);
    setReportReason("");
    setReportResult(null);
    setReportError(null);
  };

  return (
    <div
      id={isOwn ? "my-comment" : undefined}
      className={`card bg-base-100 shadow-sm ${isOwn ? "ring-1 ring-primary/20" : ""} ${highlight ? "animate-highlight-comment" : ""}`}
    >
      <div className="card-body p-4 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={`/pages/user/${comment.user.id}`}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <UserAvatar
                username={comment.user.username}
                imageUrl={comment.user.profile_image_url}
                size="sm"
              />
              <span className="font-semibold text-sm hover:text-primary transition-colors">
                {comment.user.username}
              </span>
            </Link>
            <span className="text-xs text-base-content/40">
              {formatDate(comment.created_at)}
              {comment.updated_at && " (szerkesztve)"}
            </span>
          </div>

          <div className="flex gap-1">
            {!isOwn && currentUser && !isEditing && (
              <button
                className="btn btn-ghost btn-xs"
                title="Jelentés"
                onClick={() => setReportOpen(true)}
              >
                🚩
              </button>
            )}

            {(isOwn || isAdmin) && !isEditing && (
              <>
                {isOwn && (
                  <button
                    className="btn btn-ghost btn-xs"
                    title="Szerkesztés"
                    onClick={startEditing}
                  >
                    ✏️
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-xs text-error"
                  title={isAdmin && !isOwn ? "Törlés (admin)" : "Törlés"}
                  onClick={() => onDelete(comment.id)}
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-2 mt-1">
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              maxLength={1000}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost btn-xs" onClick={cancelEditing}>
                Mégse
              </button>
              <button
                className="btn btn-primary btn-xs"
                disabled={submitting || !editContent.trim()}
                onClick={handleSave}
              >
                {submitting ? <span className="loading loading-spinner loading-xs" /> : "Mentés"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        )}
      </div>

      {reportOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-2">Komment jelentése</h3>
            <p className="text-sm text-base-content/60 mb-4">
              Miért szeretnéd jelenteni{" "}
              <span className="font-semibold">{comment.user.username}</span> kommentjét?
            </p>

            {reportResult === "success" ? (
              <div className="flex flex-col gap-4">
                <div className="alert alert-success text-sm">
                  <span>Jelentés sikeresen elküldve. Köszönjük!</span>
                </div>
                <div className="modal-action">
                  <button className="btn btn-ghost" onClick={closeReport}>
                    Bezárás
                  </button>
                </div>
              </div>
            ) : (
              <>
                {reportError && (
                  <div className="alert alert-error text-sm mb-3">
                    <span>{reportError}</span>
                  </div>
                )}
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  maxLength={500}
                  placeholder="Írd le az okot... (kötelező)"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <div className="text-xs text-base-content/40 mt-1 text-right">
                  {reportReason.length}/500
                </div>
                <div className="modal-action">
                  <button className="btn btn-ghost" onClick={closeReport} disabled={reportLoading}>
                    Mégse
                  </button>
                  <button
                    className="btn btn-error"
                    disabled={reportLoading || !reportReason.trim()}
                    onClick={handleReport}
                  >
                    {reportLoading ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      "🚩 Jelentés küldése"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="modal-backdrop" onClick={closeReport} />
        </div>
      )}
    </div>
  );
}
