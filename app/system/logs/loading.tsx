import {
  Skeleton,
  StatCardSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/ui/Skeleton";

export default function LogsLoading() {
  return (
    <div className="space-y-6 pb-10">
      <Skeleton className="h-7 w-32 rounded-lg" />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-20 rounded-xl" />
        </div>
      </div>

      {/* Logs Table */}
      <TableSkeleton rows={12} columns={6} />
    </div>
  );
}
