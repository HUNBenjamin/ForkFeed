type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function CommentPagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center gap-2 mt-2">
      <button
        className="btn btn-sm btn-ghost"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Előző
      </button>
      <span className="text-sm flex items-center text-base-content/60">
        {page} / {totalPages}
      </span>
      <button
        className="btn btn-sm btn-ghost"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Következő →
      </button>
    </div>
  );
}
