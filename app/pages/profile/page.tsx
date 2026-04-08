"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../main/components/Navbar";
import ProfileTabs from "./components/ProfileTabs";
import ProfileCard from "./components/ProfileCard";
import StatsCard from "./components/StatsCard";
import EditProfileModal from "./components/EditProfileModal";

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

type Stats = {
  recipes_count: number;
  comments_count: number;
  ratings_given_count: number;
  favorites_count: number;
  recipe_books_count: number;
  average_recipe_rating: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/pages/login");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/users/me", { headers }).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/users/me/stats", { headers }).then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([userData, statsData]) => {
        setUser(userData.user);
        setStats(statsData.stats);
      })
      .catch(() => setError("Nem sikerült betölteni a profilt."))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="alert alert-error max-w-sm">
          <span>{error ?? "Ismeretlen hiba"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />
      <ProfileTabs />

      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        <ProfileCard user={user} onEdit={() => setEditOpen(true)} />
        {stats && <StatsCard stats={stats} />}
      </div>

      {editOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSave={(updated) => {
            setUser(updated);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
