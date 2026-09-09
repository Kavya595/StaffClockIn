export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-8 h-8 rounded-full shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 shimmer rounded w-1/3" />
        <div className="h-2 shimmer rounded w-1/5" />
      </div>
      <div className="h-5 w-16 shimmer rounded-full" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-ink-100 rounded-card p-5">
      <div className="h-2.5 shimmer rounded w-1/2 mb-3" />
      <div className="h-7 shimmer rounded w-1/3" />
    </div>
  );
}
