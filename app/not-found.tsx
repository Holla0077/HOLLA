import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070B1A] text-slate-100 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-6 text-center">
          <div className="text-emerald-400 text-6xl font-bold mb-2">404</div>
          <h1 className="text-2xl font-semibold text-white mb-2">Page not found</h1>
          <p className="text-slate-400 text-sm mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/app/home"
            className="inline-block rounded-[14px] bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-600 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </body>
    </html>
  );
}
