export type Comment = {
  id: number;
  content: string;
  created_at: string;
  updated_at: string | null;
  user: {
    id: number;
    username: string;
    profile_image_url: string | null;
  };
};

export type CurrentUser = {
  id: number;
  username: string;
  profile_image_url: string | null;
  role: string;
} | null;

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getToken() {
  return localStorage.getItem("token");
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
