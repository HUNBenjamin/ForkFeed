"use client";

import { useState } from "react";
import UserAvatar from "../UserAvatar";
import type { CurrentUser } from "./commentTypes";

type Props = {
  currentUser: NonNullable<CurrentUser>;
  submitting: boolean;
  onSubmit: (content: string) => void;
  onCancel: () => void;
};

export default function CommentForm({ currentUser, submitting, onSubmit, onCancel }: Props) {
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim());
    setContent("");
  };

  return (
    <div className="card bg-base-100 shadow-sm mb-6">
      <div className="card-body p-4 gap-3">
        <div className="flex items-center gap-2">
          <UserAvatar
            username={currentUser.username}
            imageUrl={currentUser.profile_image_url}
            size="sm"
          />
          <span className="font-semibold text-sm">{currentUser.username}</span>
        </div>
        <textarea
          className="textarea textarea-bordered w-full"
          placeholder="Írj hozzászólást..."
          rows={3}
          maxLength={1000}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-base-content/40">{content.length}/1000</span>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={submitting}>
              Mégse
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={submitting || !content.trim()}
              onClick={handleSubmit}
            >
              {submitting ? <span className="loading loading-spinner loading-xs" /> : "Küldés"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
