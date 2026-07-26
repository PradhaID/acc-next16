import {
  Skeleton,
  StatCardSkeleton,
  FilterBarSkeleton,
  ListCardSkeleton,
} from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-6">
        <Skeleton className="h-7 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 mt-2 rounded-lg" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-6">
        <Skeleton className="h-4 w-28 rounded-lg mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <Skeleton className="h-4 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Published Content */}
      <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-6">
        <Skeleton className="h-4 w-40 rounded-lg mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <Skeleton className="h-4 flex-1 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Users & Groups */}
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-32 rounded-lg" />
              <Skeleton className="h-3 w-16 rounded-lg" />
            </div>
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <ListCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-6">
        <Skeleton className="h-4 w-32 rounded-lg mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-3 w-3 rounded-full shrink-0 mt-1.5" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 rounded-lg" />
                <Skeleton className="h-3 w-64 mt-1.5 rounded-lg" />
              </div>
              <Skeleton className="h-3 w-20 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
