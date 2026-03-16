"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

type StatusFilter = "ALL" | "COMPLETED" | "PENDING" | "FAILED";
const STATUS_FILTERS = ["ALL", "COMPLETED", "PENDING", "FAILED"] as const;
type UiTx = {
  id: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  rail: string;
  method: string;
  asset: string;
  amount: string; // BigInt string (for now)
  feeTotal: string; // BigInt string
  createdAt: string; // ISO
  metadata: unknown;
};

function fmtIso(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong";
}

function statusPill(s: UiTx["status"]) {
  if (s === "COMPLETED") return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30";
  if (s === "PENDING") return "bg-yellow-500/10 text-yellow-200 border border-yellow-500/30";
  return "bg-red-500/10 text-red-200 border border-red-500/30";
}

function safeString(v: unknown) {
  try {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

function formatAmount(amountStr: string, asset: string) {
  if (asset === "GHS") {
    try {
      const n = BigInt(amountStr);
      const sign = n < 0n ? "-" : "";
      const abs = n < 0n ? -n : n;
      const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      const frac = (abs % 100n).toString().padStart(2, "0");
      return `${sign}GH\u20b5 ${whole}.${frac}`;
    } catch {
      return `GH\u20b5 0.00`;
    }
  }
  // Crypto: stored in satoshi-like minor units (×1e8)
  try {
    const n = BigInt(amountStr);
    const sign = n < 0n ? "-" : "";
    const abs = n < 0n ? -n : n;
    const whole = abs / 100000000n;
    const frac = (abs % 100000000n).toString().padStart(8, "0").replace(/0+$/, "") || "0";
    return `${sign}${whole}.${frac} ${asset}`;
  } catch {
    return `${amountStr} ${asset}`;
  }
}

export default function ActivityPage() {
  const [txs, setTxs] = useState<UiTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // UI state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | UiTx["status"]>("ALL");
  const [selected, setSelected] = useState<UiTx | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/transactions");
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          // keep page usable if API returns non-json
          if (!alive) return;
          setTxs([]);
          return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load activity");

        if (!alive) return;
        setTxs(Array.isArray(data.transactions) ? data.transactions : []);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(getErrorMessage(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return txs
      .filter((t) => (status === "ALL" ? true : t.status === status))
      .filter((t) => {
        if (!needle) return true;
        const hay = [
          t.asset,
          t.method,
          t.rail,
          t.status,
          t.id,
          safeString(t.metadata),
          t.amount,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [txs, q, status]);

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">History</h1>
          <p className="mt-1 text-[14px] text-slate-200/80">All transactions across your wallets.</p>
        </div>

        <Link
          href="/app/home"
          className="rounded-[14px] border border-slate-200/30 bg-transparent px-4 py-2 text-[13px] font-semibold text-white/90 hover:border-slate-200/50"
        >
          Back to Summary
        </Link>
      </div>

      {/* Error */}
      {err && (
        <div className="mt-5 rounded-[16px] border border-red-700/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* Controls */}
      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by asset, method, rail, status, ID…"
            className="h-10 w-full rounded-[14px] border border-slate-200/25 bg-transparent px-4 text-[13px] text-white outline-none placeholder:text-slate-400 focus:border-emerald-400/60"
          />

          <div className="flex items-center gap-2">
            {STATUS_FILTERS.map((s) => {
    const active = status === s;
    return (
      <button
        key={s}
        type="button"
        onClick={() => setStatus(s)}
        className={[
          "h-10 rounded-[14px] border px-3 text-[12px] font-semibold",
          active
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
            : "border-slate-200/25 bg-transparent text-white/85 hover:border-slate-200/40",
        ].join(" ")}
      >
        {s}
      </button>
    );
  })}
</div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="text-[12px] text-slate-200/70">
            Showing <span className="text-white font-semibold">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-6 rounded-[22px] border border-slate-200/25 bg-transparent">
        <div className="hidden md:grid grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr] gap-3 px-5 py-3 text-[12px] text-slate-200/70 border-b border-slate-200/15">
          <div>Date</div>
          <div>Asset / Method</div>
          <div>Rail</div>
          <div>Status</div>
          <div className="text-right">Amount</div>
        </div>

        {loading ? (
          <div className="px-5 py-6 text-[14px] text-slate-200/70">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-6 text-[14px] text-slate-200/70">No transactions found.</div>
        ) : (
          <div className="divide-y divide-slate-200/10">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                className="w-full text-left px-5 py-4 hover:bg-slate-900/10 transition-colors"
              >
                <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr] md:items-center">
                  <div className="text-[13px] text-white/90">{fmtIso(t.createdAt)}</div>

                  <div className="flex items-center justify-between md:block">
                    <div className="text-[13px] font-semibold text-white">
                      {t.asset} <span className="text-slate-200/60">·</span>{" "}
                      <span className="text-emerald-300">{t.method}</span>
                    </div>
                    <div className="md:hidden text-[12px] text-slate-200/70">{t.rail}</div>
                  </div>

                  <div className="hidden md:block text-[13px] text-white/85">{t.rail}</div>

                  <div className="flex items-center gap-2">
                    <span className={["text-[11px] px-3 py-1 rounded-full", statusPill(t.status)].join(" ")}>
                      {t.status}
                    </span>
                    <span className="hidden sm:inline text-[11px] text-slate-200/60 truncate max-w-[220px]">
                      {t.id}
                    </span>
                  </div>

                  <div className="text-right text-[13px] font-semibold text-white">{formatAmount(t.amount, t.asset)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <button aria-label="Close" onClick={() => setSelected(null)} className="absolute inset-0 bg-black/60" />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-slate-200/15 bg-[#070B1A] shadow-2xl">
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200/10">
              <div>
                <div className="text-[12px] text-slate-200/70">Transaction details</div>
                <div className="mt-1 text-[16px] font-semibold text-white">
                  {selected.asset} <span className="text-slate-200/60">·</span>{" "}
                  <span className="text-emerald-300">{selected.method}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-[14px] border border-slate-200/20 bg-transparent px-4 py-2 text-[13px] font-semibold text-white/90 hover:border-slate-200/35"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-5 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[14px] border border-slate-200/15 bg-transparent px-4 py-3">
                  <div className="text-[12px] text-slate-200/70">Status</div>
                  <div className="mt-2">
                    <span className={["text-[11px] px-3 py-1 rounded-full", statusPill(selected.status)].join(" ")}>
                      {selected.status}
                    </span>
                  </div>
                </div>

                <div className="rounded-[14px] border border-slate-200/15 bg-transparent px-4 py-3">
                  <div className="text-[12px] text-slate-200/70">Date</div>
                  <div className="mt-2 text-[13px] font-semibold text-white">{fmtIso(selected.createdAt)}</div>
                </div>

                <div className="rounded-[14px] border border-slate-200/15 bg-transparent px-4 py-3">
                  <div className="text-[12px] text-slate-200/70">Rail</div>
                  <div className="mt-2 text-[13px] font-semibold text-white">{selected.rail}</div>
                </div>

                <div className="rounded-[14px] border border-slate-200/15 bg-transparent px-4 py-3">
                  <div className="text-[12px] text-slate-200/70">Amount</div>
                  <div className="mt-2 text-[13px] font-semibold text-white">{formatAmount(selected.amount, selected.asset)}</div>
                </div>

                <div className="rounded-[14px] border border-slate-200/15 bg-transparent px-4 py-3">
                  <div className="text-[12px] text-slate-200/70">Fees</div>
                  <div className="mt-2 text-[13px] font-semibold text-white">{formatAmount(selected.feeTotal, selected.asset)}</div>
                </div>

                <div className="rounded-[14px] border border-slate-200/15 bg-transparent px-4 py-3">
                  <div className="text-[12px] text-slate-200/70">Transaction ID</div>
                  <div className="mt-2 text-[12px] font-semibold text-white break-all">{selected.id}</div>
                </div>
              </div>

              <div className="rounded-[14px] border border-slate-200/15 bg-transparent px-4 py-3">
                <div className="text-[12px] text-slate-200/70">Metadata</div>
                <pre className="mt-2 max-h-[220px] overflow-auto text-[12px] text-slate-100/90 whitespace-pre-wrap break-words">
                  {safeString(selected.metadata) || "(none)"}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}