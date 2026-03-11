import React from "react";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  profile_image_url: string | null;
  bio: string | null;
  created_at: string;
};

type Props = {
  user: User;
  onEdit: () => void;
};

export default function ProfileCard({ user, onEdit }: Props) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body flex flex-col items-center gap-4">
        {/* Avatar */}
        <div className="avatar">
          <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
            {user.profile_image_url ? (
              <img src={user.profile_image_url} alt={user.username} />
            ) : (
              <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full text-3xl font-bold select-none">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-base-content/50 text-sm">{user.email}</p>
          <span className="badge badge-neutral badge-sm mt-1">{user.role}</span>
          {user.bio && (
            <p className="mt-3 text-base-content/70 text-sm leading-relaxed">{user.bio}</p>
          )}
          <p className="mt-2 text-xs text-base-content/40">
            Csatlakozott: {new Date(user.created_at).toLocaleDateString("hu-HU")}
          </p>
        </div>

        {/* Edit button */}
        <button onClick={onEdit} className="btn btn-sm btn-outline">
          ✏️ Szerkesztés
        </button>
      </div>
    </div>
  );
}
