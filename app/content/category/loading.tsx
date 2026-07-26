import {
  Skeleton,
  PageHeaderSkeleton,
  GridSkeleton,
} from "@/components/ui/Skeleton";

export default function CategoryLoading() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeaderSkeleton />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-5">
            <Skeleton className="h-3 w-24 rounded-lg" />
            <Skeleton className="h-7 w-16 mt-2 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 rounded-lg" />
                <Skeleton className="h-3 w-24 mt-1.5 rounded-lg" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full mt-4 rounded-lg" />
            <Skeleton className="h-3 w-2/3 mt-1.5 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
