import { Skeleton, StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function SystemReportLoading() {
  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Logs Table */}
      <TableSkeleton rows={10} columns={5} />
    </div>
  );
}
