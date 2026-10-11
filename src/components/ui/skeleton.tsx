import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-800/60 dark:bg-slate-800/80',
        className
      )}
      {...props}
    />
  );
}

/**
 * Responsive Stats Skeleton (matches 4 stat cards on PC, 2x2 or scroll on mobile)
 */
export function StatsSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-20 sm:w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-7 sm:h-8 w-28 sm:w-36 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Responsive Table/Card Skeleton:
 * Shows sleek desktop table rows on lg+, and clean cards on mobile screens!
 */
export function ResponsiveTableSkeleton({
  rows = 5,
  mobileCards = 3,
}: {
  rows?: number;
  mobileCards?: number;
}) {
  return (
    <div className="w-full">
      {/* Mobile view (< md) */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: mobileCards }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop view (>= md) */}
      <div className="hidden md:block rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
        <div className="border-b border-slate-800/80 px-6 py-3 flex items-center justify-between bg-slate-900/80">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="divide-y divide-slate-800/50">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 w-1/3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
