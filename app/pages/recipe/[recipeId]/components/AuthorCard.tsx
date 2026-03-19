import UserAvatar from "./UserAvatar";

type Props = {
  username: string;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function AuthorCard({ username, profileImageUrl, createdAt, updatedAt }: Props) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar username={username} imageUrl={profileImageUrl} />
      <div>
        <p className="font-semibold text-sm">{username}</p>
        <p className="text-xs text-base-content/40">
          {formatDate(createdAt)}
          {updatedAt && ` · Frissítve: ${formatDate(updatedAt)}`}
        </p>
      </div>
    </div>
  );
}
