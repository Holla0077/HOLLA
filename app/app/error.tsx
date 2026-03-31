"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[AppError]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="text-4xl font-bold text-emerald-400 mb-4">Oops</div>
      <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-sm">
        This page ran into an error. Try refreshing or go back to the dashboard.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-500 mb-4 font-mono">Ref: {error.digest}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-[14px] bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-600 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/app/home"
          className="rounded-[14px] border border-slate-200/30 px-5 py-2.5 text-sm text-white/80 hover:border-slate-200/60 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
