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

function formatGhs(balanceStr: string) {
  try {
    const n = BigInt(balanceStr);
    const sign = n < 0n ? "-" : "";
    const abs = n < 0n ? -n : n;
    const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const frac = (abs % 100n).toString().padStart(2, "0");
    return `${sign}GH\u20b5 ${whole}.${frac}`;
  } catch {
    return `GH\u20b5 0.00`;
  }
}

export default function SendReceiveCashPage() {
  const [wallets, setWallets] = useState<UiWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);

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
    return () => { alive = false; };
  }, []);

  async function handleSend() {
    setSendError(null);
    setSendOk(null);
    if (!recipient.trim()) { setSendError("Enter a recipient."); return; }
    if (!amount || Number(amount) <= 0) { setSendError("Enter a valid amount."); return; }

    setSendBusy(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIdentifier: recipient.trim(),
          assetCode: "GHS",
          amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSendError(data?.error || "Send failed."); return; }
      setSendOk(`Sent successfully! Transaction ID: ${data.transactionId}`);
      setRecipient("");
      setAmount("");
      const r2 = await fetch("/api/wallets");
      const d2 = await r2.json();
      if (d2.wallets) setWallets(d2.wallets);
    } catch (e) {
      setSendError(getErrorMessage(e));
    } finally {
      setSendBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-slate-200/70">SEND / RECEIVE</div>
        <h1 className="mt-1 text-[22px] font-semibold text-white">Cash (GHS)</h1>
        <p className="mt-1 text-sm text-slate-200/80">
          Send to another HOLLA user (username / email / phone) or share your wallet to receive.
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
            No cash wallet found. (Wallets are created automatically after signup.)
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
              {formatGhs(cashWallet.balance)}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {/* Send Cash */}
              <div className="rounded-[14px] border border-slate-200/25 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-white">Send Cash</div>
                  <div className="mt-1 text-xs text-slate-200/70">To username / email / phone</div>
                </div>

                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Recipient (username / email / +233...)"
                />
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Amount in GHS (e.g. 50)"
                  type="number"
                  min="0"
                  step="0.01"
                />

                {sendError && (
                  <div className="rounded-lg border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {sendError}
                  </div>
                )}
                {sendOk && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200 break-all">
                    {sendOk}
                  </div>
                )}

                <button
                  type="button"
                  disabled={sendBusy}
                  onClick={handleSend}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
                >
                  {sendBusy ? "Sending…" : "Send"}
                </button>
              </div>

              {/* Receive Cash */}
              <div className="rounded-[14px] border border-slate-200/25 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-white">Receive Cash</div>
                  <div className="mt-1 text-xs text-slate-200/70">Share your username or wallet ID</div>
                </div>

                <div className="rounded-lg border border-slate-200/20 bg-slate-900/10 p-3 text-sm text-white/90 break-all">
                  Wallet ID: <span className="text-emerald-300">{cashWallet.id}</span>
                </div>

                <button
                  type="button"
                  className="w-full rounded-lg border border-slate-200/40 px-4 py-2 text-sm font-semibold text-white hover:border-slate-200/70"
                  onClick={async () => {
                    await navigator.clipboard.writeText(cashWallet.id);
                    alert("Wallet ID copied to clipboard");
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
