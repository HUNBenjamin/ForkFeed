import Link from "next/link";
import UserAvatar from "./UserAvatar";

type Props = {
  authorId: number;
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

export default function AuthorCard({ authorId, username, profileImageUrl, createdAt, updatedAt }: Props) {
  return (
    <Link
      href={`/pages/user/${authorId}`}
      className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit"
    >
      <UserAvatar username={username} imageUrl={profileImageUrl} />
      <div>
        <p className="font-semibold text-sm hover:text-primary transition-colors">{username}</p>
        <p className="text-xs text-base-content/40">
          {formatDate(createdAt)}
          {updatedAt && ` · Frissítve: ${formatDate(updatedAt)}`}
        </p>
      </div>
    </Link>
  );
}
