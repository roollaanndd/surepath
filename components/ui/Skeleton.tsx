// ─── Skeleton Primitive ──────────────────────────────────────────────────────
//
// Replaces the 20+ spinner usages with content-shaped skeletons. Matches
// the layout of real content so the perceived load time is lower.
//
// Usage:
//   <SkeletonCard />
//   <SkeletonList rows={5} />
//   <SkeletonText lines={3} />

import React from 'react';

const SHIMMER_CLASS = 'animate-pulse bg-ds-border/60 rounded-md';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`${SHIMMER_CLASS} ${className}`} />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 rounded-2xl border border-ds-border bg-ds-card ${className}`}>
    <div className="flex items-center gap-3 mb-3">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2 w-3/4" />
      </div>
    </div>
    <SkeletonText lines={2} />
  </div>
);

export const SkeletonList: React.FC<{ rows?: number; className?: string }> = ({ rows = 5, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default Skeleton;
