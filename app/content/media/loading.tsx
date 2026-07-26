import { Skeleton, PageHeaderSkeleton, GridSkeleton } from "@/components/ui/Skeleton";

export default function MediaLoading() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeaderSkeleton />

      {/* Search Bar */}
      <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* Media Grid */}
      <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-6">
        <GridSkeleton count={12} />
      </div>
    </div>
  );
}
