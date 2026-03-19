type Props = {
  username: string;
  imageUrl: string | null;
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-lg",
};

export default function UserAvatar({ username, imageUrl, size = "md" }: Props) {
  return (
    <div className="avatar placeholder">
      <div
        className={`bg-primary text-primary-content rounded-full flex items-center justify-center ${sizeClasses[size]}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={username} className="rounded-full" />
        ) : (
          username.charAt(0).toUpperCase()
        )}
      </div>
    </div>
  );
}
