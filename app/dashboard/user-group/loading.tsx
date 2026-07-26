import { Skeleton, StatCardSkeleton } from "@/components/ui/Skeleton";

export default function UserGroupReportLoading() {
  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-64 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Distribution Summary */}
      <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-6">
        <Skeleton className="h-4 w-40 rounded-lg mb-6" />
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-3 w-36 rounded-lg" />
                <Skeleton className="h-3 w-12 rounded-lg" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
