export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} aria-hidden="true" />
);

export const CardSkeleton = () => (
  <div className="rounded-2xl border border-line bg-surface overflow-hidden" aria-hidden="true">
    <Skeleton className="h-36 rounded-none" />
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-9 w-full" />
    </div>
  </div>
);

export const GridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const ListSkeleton = ({ rows = 5 }) => (
  <div className="space-y-3" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-14 w-full" />
    ))}
  </div>
);

export default Skeleton;
