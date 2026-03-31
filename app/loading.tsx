export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070B1A]">
      <div className="flex flex-col items-center gap-4">
        <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-400/20 border-t-emerald-400" />
        <span className="text-[13px] font-medium text-slate-400 tracking-wide">Loading KashBoy…</span>
      </div>
    </div>
  );
}
