import { Skeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function GroupLoading() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeaderSkeleton />

      {/* Search Bar */}
      <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-20 rounded-xl" />
        </div>
      </div>

      {/* Group Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <Skeleton className="h-5 w-32 rounded-lg" />
                <Skeleton className="h-3 w-20 mt-2 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-3 w-full mt-4 rounded-lg" />
            <Skeleton className="h-3 w-3/4 mt-1.5 rounded-lg" />
            <div className="flex items-center gap-4 mt-4">
              <Skeleton className="h-3 w-24 rounded-lg" />
              <Skeleton className="h-3 w-20 rounded-lg" />
            </div>
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-8 flex-1 rounded-xl" />
              <Skeleton className="h-8 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
