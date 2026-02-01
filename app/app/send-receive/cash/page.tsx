"use client";

import { useEffect, useMemo, useState } from "react";

type UiWallet = {
  id: string;
  code: string;
  name: string;
  type: "FIAT" | "CRYPTO";
  balance: string;
};

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong";
}

export default function SendReceiveCashPage() {
  const [wallets, setWallets] = useState<UiWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // cash wallet = GHS (or any FIAT you support)
  const cashWallet = useMemo(
    () => wallets.find((w) => w.code === "GHS") ?? null,
    [wallets]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/api/wallets");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load wallets");
        if (!alive) return;
        setWallets(Array.isArray(data.wallets) ? data.wallets : []);
      } catch (e) {
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

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-slate-200/70">SEND / RECEIVE</div>
        <h1 className="mt-1 text-[22px] font-semibold text-white">Cash (GHS)</h1>
        <p className="mt-1 text-sm text-slate-200/80">
          Send to another HOLLA user (username/email/phone) or receive cash into your wallet.
        </p>
      </div>

      {err && (
        <div className="rounded-[14px] border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="rounded-[18px] border border-slate-200/30 p-5">
        {loading ? (
          <div className="text-sm text-slate-300/80">Loading wallet…</div>
        ) : !cashWallet ? (
          <div className="text-sm text-slate-300/80">
            No cash wallet found. (Your backend should auto-create wallets after signup.)
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-200/70">Wallet</div>
                <div className="mt-1 text-lg font-semibold text-white">{cashWallet.name}</div>
              </div>
              <div className="rounded-full border border-slate-200/40 px-3 py-1 text-sm text-white/90">
                {cashWallet.code}
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-200/70">Balance</div>
            <div className="mt-2 text-[28px] font-semibold text-emerald-500">
              {cashWallet.balance} <span className="text-lg text-slate-200/80">{cashWallet.code}</span>
            </div>

            {/* Placeholder UI panels (we wire to your existing send/receive endpoints next) */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[14px] border border-slate-200/25 p-4">
                <div className="text-sm font-semibold text-white">Send Cash</div>
                <div className="mt-1 text-xs text-slate-200/70">To username/email/phone</div>

                <div className="mt-3 grid gap-2">
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                    placeholder="Recipient (username/email/+233...)"
                  />
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                    placeholder="Amount (e.g. 50)"
                  />
                  <button
                    type="button"
                    className="mt-1 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-600"
                    onClick={() => alert("Next: wire to your cash send endpoint")}
                  >
                    Send
                  </button>
                </div>
              </div>

              <div className="rounded-[14px] border border-slate-200/25 p-4">
                <div className="text-sm font-semibold text-white">Receive Cash</div>
                <div className="mt-1 text-xs text-slate-200/70">Your receive details</div>

                <div className="mt-3 rounded-lg border border-slate-200/20 bg-slate-900/10 p-3 text-sm text-white/90">
                  Wallet ID: <span className="text-emerald-300">{cashWallet.id}</span>
                </div>

                <button
                  type="button"
                  className="mt-3 w-full rounded-lg border border-slate-200/40 px-4 py-2 text-sm font-semibold text-white hover:border-slate-200/70"
                  onClick={async () => {
                    await navigator.clipboard.writeText(cashWallet.id);
                    alert("Copied wallet id");
                  }}
                >
                  Copy Wallet ID
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}