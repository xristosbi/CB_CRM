import { Skeleton } from "@/components/ui/skeleton";

// Shared skeleton shapes for route-level loading.tsx files — approximate,
// not pixel-perfect: their only job is to paint something immediately so a
// sidebar click never looks like it did nothing.

export function BoardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-8 w-72" />
      </div>
      <div className="flex flex-1 gap-3 overflow-hidden p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted/40 p-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="p-4 md:p-6">
      <Skeleton className="h-8 w-40" />
      <div className="mt-4 flex flex-col gap-4">
        <Skeleton className="h-9 w-72" />
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center gap-4 border-b p-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b p-3 last:border-b-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <Skeleton className="h-4 w-24" />
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-8 w-80" />
      </div>
      <div className="grid flex-1 grid-cols-7 gap-px overflow-hidden bg-border p-px">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <Skeleton className="h-8 w-40" />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}
