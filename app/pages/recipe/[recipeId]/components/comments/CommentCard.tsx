"use client";

import { useState } from "react";
import Link from "next/link";
import UserAvatar from "../UserAvatar";
import type { Comment, CurrentUser } from "./commentTypes";
import { formatDate } from "./commentTypes";

type Props = {
  comment: Comment;
  currentUser: CurrentUser;
  submitting: boolean;
  highlight?: boolean;
  onEdit: (commentId: number, content: string) => void;
  onDelete: (commentId: number) => void;
};

export default function CommentCard({ comment, currentUser, submitting, highlight, onEdit, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

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

          {(isOwn || isAdmin) && !isEditing && (
            <div className="flex gap-1">
              {isOwn && (
                <button className="btn btn-ghost btn-xs" title="Szerkesztés" onClick={startEditing}>
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
            </div>
          )}
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
    </div>
  );
}
