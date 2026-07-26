import {
  PageHeaderSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/ui/Skeleton";

export default function AdLoading() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
