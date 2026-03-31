"use client";

export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        {/* Pulsing KashBoy logo skeleton */}
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-400/15 border-t-emerald-400" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-emerald-400/60">KB</span>
          </div>
        </div>

        {/* Skeleton content blocks */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-2 w-28 animate-pulse rounded-full bg-slate-700/60" />
          <div className="h-2 w-20 animate-pulse rounded-full bg-slate-700/40" />
        </div>
      </div>
    </div>
  );
}
