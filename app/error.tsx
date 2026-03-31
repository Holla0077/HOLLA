"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console only in development
    if (process.env.NODE_ENV !== "production") {
      console.error("[GlobalError]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070B1A] text-slate-100 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-6 text-center">
          <div className="text-emerald-400 text-5xl mb-4 font-bold">KB</div>
          <h1 className="text-2xl font-semibold text-white mb-2">Something went wrong</h1>
          <p className="text-slate-400 text-sm mb-6">
            An unexpected error occurred. Please try again or contact support if the issue persists.
          </p>
          {error.digest && (
            <p className="text-xs text-slate-500 mb-4 font-mono">Error ID: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="rounded-[14px] bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-600 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
