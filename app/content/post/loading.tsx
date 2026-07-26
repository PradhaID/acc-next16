import {
  PageHeaderSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/ui/Skeleton";

export default function PostLoading() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}
