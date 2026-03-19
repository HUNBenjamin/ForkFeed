"use client";
import React, { useState } from "react";
import ImageUpload from "@/app/components/ImageUpload";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  profile_image_url: string | null;
  bio: string | null;
  created_at: string;
  last_login: string | null;
};

type Props = {
  user: User;
  onClose: () => void;
  onSave: (updated: User) => void;
};

export default function EditProfileModal({ user, onClose, onSave }: Props) {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio ?? "");
  const [imageUrl, setImageUrl] = useState(user.profile_image_url ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          bio: bio || null,
          profile_image_url: imageUrl || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Mentés sikertelen");
        return;
      }
      onSave(data.user);
    } catch {
      setError("Hálózati hiba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Profil szerkesztése</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Felhasználónév</legend>
            <input
              className="input input-bordered w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Bio</legend>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Írj magadról pár szót..."
            />
          </fieldset>
          <fieldset className="fieldset">
            <ImageUpload
              type="avatar"
              currentUrl={imageUrl || null}
              label="Profilkép"
              onUpload={(url) => setImageUrl(url)}
            />
          </fieldset>
          {error && (
            <div className="alert alert-error py-2 text-sm">
              <span>{error}</span>
            </div>
          )}
          <div className="modal-action mt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Mégse
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <span className="loading loading-spinner loading-sm" /> : "Mentés"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
