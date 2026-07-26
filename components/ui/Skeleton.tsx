"use client";

import React from "react";

function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-stone-200 dark:bg-stone-700/50 ${className}`}
      {...props}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20 mt-4 rounded-lg" />
      <Skeleton className="h-3 w-28 mt-2 rounded-lg" />
    </div>
  );
}

function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-stone-100 dark:border-stone-800">
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-4 rounded" />
      </td>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="flex items-center gap-3">
            {i === 0 && <Skeleton className="h-9 w-9 rounded-full shrink-0" />}
            <Skeleton className={`h-4 rounded-lg ${i === 0 ? "w-36" : "w-24"}`} />
          </div>
        </td>
      ))}
    </tr>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ListCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-32 rounded-lg" />
        <Skeleton className="h-3 w-48 mt-1.5 rounded-lg" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm p-6">
      <Skeleton className="h-4 w-36 rounded-lg" />
      <Skeleton className="h-6 w-48 mt-4 rounded-lg" />
      <Skeleton className="h-3 w-full mt-3 rounded-lg" />
      <Skeleton className="h-3 w-3/4 mt-1.5 rounded-lg" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-8 w-20 rounded-xl" />
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>
    </div>
  );
}

function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 mt-2 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-36 rounded-xl" />
    </div>
  );
}

function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-4 rounded" />
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className={`h-3 rounded-lg ${i === 0 ? "w-36" : "w-20"}`} />
          ))}
        </div>
      </div>
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GridSkeleton({
  count = 6,
  aspect = "aspect-square",
}: {
  count?: number;
  aspect?: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${aspect} rounded-2xl`} />
      ))}
    </div>
  );
}

export {
  Skeleton,
  StatCardSkeleton,
  TableRowSkeleton,
  FilterBarSkeleton,
  ListCardSkeleton,
  CardSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
  GridSkeleton,
};
