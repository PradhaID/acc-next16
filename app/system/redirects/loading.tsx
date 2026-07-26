import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function RedirectsLoading() {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <TableSkeleton rows={6} columns={4} />
    </div>
  );
}
