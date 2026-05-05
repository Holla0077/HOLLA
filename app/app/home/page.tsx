"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { WalletCard, formatWalletBalance } from "@/app/app/components/WalletCard";

type UiWallet = {
  id: string;
  assetId: string;
  code: string;
  name: string;
  type: "FIAT" | "CRYPTO";
  balance: string;
};

type UiTx = {
  id: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  rail: string;
  method: string;
  asset: string;
  amount: string;
  feeTotal: string;
  createdAt: string;
  metadata: unknown;
};

const GHS_STORAGE: "minor" | "major" = "minor";

function toBigIntSafe(v: unknown) {
  try { return BigInt(String(v)); } catch { return 0n; }
}

function formatWithCommas(intStr: string) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatGhs(balanceStr: string) {
  if (!balanceStr) return "GH₵ 0.00";
  if (GHS_STORAGE === "major") {
    const n = Number(balanceStr);
    if (!Number.isFinite(n)) return "GH₵ 0.00";
    return `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const n = toBigIntSafe(balanceStr);
  const sign = n < 0n ? "-" : "";
  const abs = n < 0n ? -n : n;
  const whole = abs / 100n;
  const frac = abs % 100n;
  const wholeStr = formatWithCommas(whole.toString());
  const fracStr = frac.toString().padStart(2, "0");
  return `${sign}GH₵ ${wholeStr}.${fracStr}`;
}

function formatTxAmount(amountStr: string, asset: string) {
  if (asset === "GHS" || asset === "GH₵") return formatGhs(amountStr);
  return amountStr;
}

function isFiat(code: string) { return code === "GHS"; }

function fmtIso(iso: string) { const d = new Date(iso); return d.toLocaleString(); }

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong";
}

const USD_GHS_RATE = 12.5;
const STATIC_PRICES: Record<string, { buy: number; sell: number }> = {
  BTC: { buy: 950000, sell: 910000 },
  LTC: { buy: 1200, sell: 1100 },
  ETH: { buy: 45000, sell: 43000 },
  DASH: { buy: 900, sell: 820 },
  BCH: { buy: 8500, sell: 8000 },
  USDT_ERC20: { buy: 13.2, sell: 12.6 },
  USDC_ERC20: { buy: 13.2, sell: 12.6 },
};

function isGhs(code: string) { return code === "GHS" || code === "GH₵"; }

function formatFiatFromMinorUnits(balanceStr: string, currency = "GH₵") {
  const raw = (balanceStr ?? "0").trim();
  const digits = raw.replace(/[^\d-]/g, "") || "0";
  const neg = digits.startsWith("-");
  const d = neg ? digits.slice(1) : digits;
  const padded = d.padStart(3, "0");
  const whole = padded.slice(0, -2);
  const frac = padded.slice(-2);
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${currency} ${withCommas}.${frac}`;
}

export default function HomePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const mode = (sp.get("mode") || "cash").toLowerCase() === "crypto" ? "crypto" : "cash";

  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  const [wallets, setWallets] = useState<UiWallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [walletsError, setWalletsError] = useState<string | null>(null);

  const [txs, setTxs] = useState<UiTx[]>([]);
  const [txsLoading, setTxsLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  const [fundMethod, setFundMethod] = useState<"MOMO" | "CARD">("MOMO");
  const [topupPhone, setTopupPhone] = useState("");
  const [topupNetwork, setTopupNetwork] = useState("MTN");
  const [topupAmount, setTopupAmount] = useState("");
  const [topupCardNumber, setTopupCardNumber] = useState("");
  const [topupCardName, setTopupCardName] = useState("");
  const [topupCardExpiry, setTopupCardExpiry] = useState("");
  const [topupCardCvv, setTopupCardCvv] = useState("");
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupOk, setTopupOk] = useState<string | null>(null);
  const [topupPending, setTopupPending] = useState<string | null>(null);
  const [topupPendingMsg, setTopupPendingMsg] = useState<string | null>(null);

  const [withdrawTab, setWithdrawTab] = useState<"MOMO" | "CARD">("MOMO");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawNetwork, setWithdrawNetwork] = useState("MTN");
  const [withdrawCardNumber, setWithdrawCardNumber] = useState("");
  const [withdrawCardName, setWithdrawCardName] = useState("");
  const [withdrawCardExpiry, setWithdrawCardExpiry] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawOk, setWithdrawOk] = useState<string | null>(null);
  const [withdrawPending, setWithdrawPending] = useState<string | null>(null);

  const [tradeAmountCrypto, setTradeAmountCrypto] = useState("");
  const [tradeError, setTradeError] = useState<string | null>(null);

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/me")
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.user) setVerifyStatus(d.user.verificationStatus ?? "NONE");
        })
        .catch(() => {});
    }
    fetchStatus();
    function onVisible() { if (document.visibilityState === "visible") fetchStatus(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  async function loadWallets(showSpinner = false) {
    try {
      if (showSpinner) setWalletsLoading(true);
      setWalletsError(null);
      const res = await fetch("/api/wallets");
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server did not return JSON. Status=${res.status}. Body: ${text.slice(0, 120)}`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load wallets");
      setWallets(Array.isArray(data.wallets) ? data.wallets : []);
    } catch (e: unknown) {
      setWalletsError(getErrorMessage(e));
    } finally {
      if (showSpinner) setWalletsLoading(false);
    }
  }

  useEffect(() => { loadWallets(true); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setTxsLoading(true);
        const res = await fetch("/api/transactions");
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) { if (!alive) return; setTxs([]); return; }
        const data = await res.json();
        if (!alive) return;
        setTxs(Array.isArray(data.transactions) ? data.transactions : []);
      } catch { if (!alive) return; setTxs([]); } finally { if (!alive) return; setTxsLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const visibleWallets = useMemo(() => {
    if (mode === "cash") return wallets.filter(w => w.type === "FIAT" || w.code === "GHS");
    return wallets.filter(w => w.type === "CRYPTO" && w.code !== "GHS");
  }, [wallets, mode]);

  useEffect(() => {
    if (walletsLoading) return;
    if (!visibleWallets.length) { setSelectedId(null); return; }
    const stillVisible = selectedId && visibleWallets.some(w => w.id === selectedId);
    if (!stillVisible) setSelectedId(visibleWallets[0].id);
  }, [visibleWallets, selectedId, walletsLoading]);

  const selected = useMemo(() => visibleWallets.find(w => w.id === selectedId) ?? null, [visibleWallets, selectedId]);

  function statusPill(s: UiTx["status"]) {
    if (s === "COMPLETED") return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium";
    if (s === "PENDING") return "bg-yellow-500/10 text-yellow-200 border border-yellow-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium";
    return "bg-red-500/10 text-red-200 border border-red-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium";
  }

  const showVerifyBanner = verifyStatus === "NONE" || verifyStatus === "REJECTED";

  // Helper to build mode switch URL (keeping current query params)
  const toggleMode = (newMode: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("mode", newMode);
    router.push(`/app/home?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#070B1A] text-white pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Verification banners (existing) */}
        {showVerifyBanner && (
          <button
            onClick={() => router.push("/app/settings#verification")}
            className="w-full mb-6 flex items-center justify-between gap-3 rounded-[16px] border border-yellow-500/30 bg-yellow-500/10 px-5 py-3.5 text-left hover:bg-yellow-500/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <div className="text-[13px] font-semibold text-yellow-200">
                  {verifyStatus === "REJECTED" ? "Verification Rejected — Resubmit" : "Verify Account"}
                </div>
                <div className="text-[12px] text-yellow-200/60">
                  {verifyStatus === "REJECTED"
                    ? "Your documents were rejected. Click to resubmit your Ghana Card."
                    : "Complete identity verification to unlock sending, withdrawals and more."}
                </div>
              </div>
            </div>
            <svg className="w-4 h-4 text-yellow-400/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {verifyStatus === "PENDING" && (
          <div className="w-full mb-6 flex items-center gap-3 rounded-[16px] border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-left">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-[13px] text-blue-200">Verification under review — we will update you within 1–2 business days.</div>
          </div>
        )}

        {/* TOP BAR: Greeting, total balance, quick actions, mode toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Dashboard</h1>
            <p className="text-slate-400 mt-1 text-sm">Welcome back{selected ? `, ${selected.name}` : ""}.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Cash/Crypto Toggle */}
            <div className="inline-flex rounded-xl border border-slate-700 p-0.5 bg-slate-900/50">
              <button
                onClick={() => toggleMode("cash")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${mode === "cash" ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "text-slate-400 hover:text-white"}`}
              >
                Cash
              </button>
              <button
                onClick={() => toggleMode("crypto")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${mode === "crypto" ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "text-slate-400 hover:text-white"}`}
              >
                Crypto
              </button>
            </div>
            <Link
              href="/app/send-receive"
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)] whitespace-nowrap"
            >
              Send / Receive
            </Link>
          </div>
        </div>

        {/* WALLET CARDS ROW */}
        <div className="mb-8">
          {walletsLoading ? (
            <div className="text-sm text-slate-400">Loading wallets…</div>
          ) : visibleWallets.length === 0 ? (
            <div className="text-sm text-slate-400">No wallets yet.</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
              {visibleWallets.map(w => (
                <WalletCard
                  key={w.id}
                  name={w.name}
                  code={w.code}
                  formattedBalance={formatWalletBalance(w.code, w.balance)}
                  active={w.id === selectedId}
                  onClick={() => setSelectedId(w.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* MAIN CONTENT: Selected Wallet Details + Recent Activity */}
        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          {/* Selected Wallet Panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5">
            {!selected ? (
              <div className="text-sm text-slate-400">Select a wallet above to see details.</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Selected Wallet</div>
                    <div className="text-xl font-semibold mt-0.5">
                      {selected.name} <span className="text-emerald-400 text-lg">· {selected.code}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                    {selected.code}
                  </div>
                </div>

                <div className="mb-5">
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Balance</div>
                  <div className="text-3xl font-bold text-emerald-400 mt-1">
                    {selected && isGhs(selected.code) ? formatFiatFromMinorUnits(selected.balance, "GH₵") : selected?.balance}
                    <span className="text-lg text-slate-400 ml-1">{selected.code}</span>
                  </div>
                  {isGhs(selected.code) && (
                    <div className="text-sm text-slate-400 mt-1">
                      ≈ ${(Number(selected.balance || "0") / 100 / USD_GHS_RATE).toFixed(2)} USD
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  {isFiat(selected.code) ? (
                    <>
                      <button onClick={() => setTopupOpen(true)} className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors">
                        Fund Wallet
                      </button>
                      <button onClick={() => { setWithdrawError(null); setWithdrawOpen(true); }} className="rounded-xl border border-slate-600 bg-transparent py-2.5 text-sm font-semibold text-white hover:border-slate-500 transition-colors">
                        Withdraw
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setTradeError(null); setBuyOpen(true); }} className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors">
                        Buy
                      </button>
                      <button onClick={() => { setTradeError(null); setSellOpen(true); }} className="rounded-xl border border-slate-600 bg-transparent py-2.5 text-sm font-semibold text-white hover:border-slate-500 transition-colors">
                        Sell
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Recent Activity Panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold uppercase tracking-wider text-white">Recent Activity</div>
              <Link href="/app/activity" className="text-xs text-emerald-400 hover:text-emerald-300">View all</Link>
            </div>
            <div className="space-y-3">
              {txsLoading ? (
                <div className="text-sm text-slate-400">Loading…</div>
              ) : txs.length === 0 ? (
                <div className="text-sm text-slate-500">No transactions yet.</div>
              ) : (
                txs.slice(0, 6).map(t => (
                  <div key={t.id} className="rounded-xl border border-slate-700/50 bg-slate-800/20 px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{t.method || t.rail}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{t.asset} · {fmtIso(t.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-right">
                        {t.amount.startsWith("-") ? t.amount : "+" + t.amount} {t.asset}
                      </div>
                      <span className={statusPill(t.status)}>{t.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* --- Modals (unchanged except minor styling adjustments for consistency) --- */}

      {/* FUND (TOP UP) MODAL */}
      {topupOpen && (
        <div className="fixed inset-0 z-50">
          <button aria-label="Close" onClick={() => { setTopupOpen(false); setTopupOk(null); setTopupError(null); }} className="absolute inset-0 bg-black/60" />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Fund Wallet</div>
                <div className="mt-1 text-lg font-semibold text-white">Deposit GH₵</div>
              </div>
              <button type="button" onClick={() => { setTopupOpen(false); setTopupOk(null); setTopupError(null); }} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700">Close</button>
            </div>

            <div className="mt-5 flex gap-2">
              {(["MOMO", "CARD"] as const).map(m => (
                <button key={m} type="button" onClick={() => { setFundMethod(m); setTopupError(null); setTopupOk(null); }} className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${fundMethod === m ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-950/20 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>
                  {m === "MOMO" ? "Mobile Money" : "Visa / Card"}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {fundMethod === "MOMO" ? (
                <>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Network</div>
                    <div className="flex gap-2">
                      {["MTN", "TELECEL", "AIRTELTIGO"].map(n => (
                        <button key={n} type="button" onClick={() => setTopupNetwork(n)} className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold ${topupNetwork === n ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-950/20 text-slate-300 hover:border-slate-600"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Phone Number</div>
                    <input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupPhone} onChange={e => setTopupPhone(e.target.value)} placeholder="+233 24 000 0000" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Amount (GH₵)</div>
                    <input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} placeholder="e.g. 100" type="number" min="1" />
                  </div>
                </>
              ) : (
                <>
                  {/* Card fields (same as original) */}
                  <div><div className="mb-1 text-xs font-semibold text-slate-300">Card Number</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 tracking-wider" value={topupCardNumber} onChange={e => setTopupCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" maxLength={19} /></div>
                  <div><div className="mb-1 text-xs font-semibold text-slate-300">Cardholder Name</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupCardName} onChange={e => setTopupCardName(e.target.value)} placeholder="Name on card" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><div className="mb-1 text-xs font-semibold text-slate-300">Expiry (MM/YY)</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupCardExpiry} onChange={e => setTopupCardExpiry(e.target.value)} placeholder="08/27" maxLength={5} /></div>
                    <div><div className="mb-1 text-xs font-semibold text-slate-300">CVV</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupCardCvv} onChange={e => setTopupCardCvv(e.target.value)} placeholder="123" maxLength={4} type="password" /></div>
                  </div>
                  <div><div className="mb-1 text-xs font-semibold text-slate-300">Amount (GH₵)</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} placeholder="e.g. 100" type="number" min="1" /></div>
                </>
              )}

              {topupError && <div className="rounded-lg border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">{topupError}</div>}
              {topupOk && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{topupOk}</div>}
              {topupPending && <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200 flex items-start gap-2"><svg className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span>{topupPendingMsg || "Waiting for approval on your phone…"}</span></div>}

              <button disabled={topupBusy || !!topupPending} className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60" onClick={async () => {
                  setTopupError(null); setTopupOk(null); setTopupPending(null); setTopupPendingMsg(null);
                  if (!topupAmount || Number(topupAmount) <= 0) { setTopupError("Enter a valid amount."); return; }
                  if (!selected) { setTopupError("No wallet selected."); return; }
                  setTopupBusy(true);
                  try {
                    let res: Response;
                    if (fundMethod === "MOMO") {
                      if (!topupPhone.trim()) { setTopupError("Enter your phone number."); return; }
                      res = await fetch("/api/topup/momo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletId: selected.id, amount: topupAmount, phone: topupPhone.trim(), network: topupNetwork }) });
                    } else {
                      if (!topupCardNumber.trim() || !topupCardName.trim() || !topupCardExpiry.trim() || !topupCardCvv.trim()) { setTopupError("Please fill all card details."); return; }
                      res = await fetch("/api/topup/card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletId: selected.id, amount: topupAmount, cardNumber: topupCardNumber.trim(), cardName: topupCardName.trim(), expiry: topupCardExpiry.trim(), cvv: topupCardCvv.trim() }) });
                    }
                    const data = await res.json();
                    if (!res.ok) { setTopupError(data?.error || "Top up failed."); return; }
                    if (data.status === "PENDING" && data.referenceId) {
                      setTopupBusy(false);
                      setTopupPending(data.referenceId);
                      setTopupPendingMsg(data.message || "Check your phone and approve the MTN MoMo request.");
                      const poll = async () => {
                        let attempts = 0;
                        const maxAttempts = 30;
                        const intervalId = setInterval(async () => {
                          attempts++;
                          try {
                            const sr = await fetch(`/api/topup/momo/status?ref=${data.referenceId}`);
                            const sd = await sr.json();
                            if (sd.status === "COMPLETED") {
                              clearInterval(intervalId);
                              setTopupPending(null); setTopupPendingMsg(null);
                              setTopupOk(sd.message || `GH₵ ${topupAmount} credited to your wallet.`);
                              setTopupAmount(""); setTopupPhone("");
                              await loadWallets();
                            } else if (sd.status === "FAILED" || attempts >= maxAttempts) {
                              clearInterval(intervalId);
                              setTopupPending(null); setTopupPendingMsg(null);
                              setTopupError(sd.message || "Payment timed out. Please try again.");
                            } else {
                              setTopupPendingMsg(sd.message || "Waiting for approval on your phone…");
                            }
                          } catch {}
                        }, 5000);
                      };
                      poll();
                      return;
                    }
                    setTopupOk(data.message || (fundMethod === "MOMO" ? `GH₵ ${topupAmount} credited to your wallet via ${topupNetwork} MoMo.` : `GH₵ ${topupAmount} credited to your wallet via card ending ${topupCardNumber.slice(-4)}.`));
                    setTopupAmount(""); setTopupPhone(""); setTopupCardNumber(""); setTopupCardName(""); setTopupCardExpiry(""); setTopupCardCvv("");
                    await loadWallets();
                  } catch (e) { setTopupError(e instanceof Error ? e.message : "Something went wrong."); } finally { setTopupBusy(false); }
              }}>
                {topupBusy ? "Processing…" : topupPending ? "Awaiting approval…" : `Fund Wallet — GH₵ ${topupAmount || "0"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL – keep existing, unchanged */}
      {withdrawOpen && selected && isFiat(selected.code) && (
        <div className="fixed inset-0 z-50">
          <button aria-label="Close" onClick={() => { setWithdrawOpen(false); setWithdrawOk(null); setWithdrawError(null); }} className="absolute inset-0 bg-black/60" />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Withdraw</div>
                <div className="mt-1 text-lg font-semibold text-white">Withdraw GH₵</div>
              </div>
              <button type="button" onClick={() => { setWithdrawOpen(false); setWithdrawOk(null); setWithdrawError(null); }} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700">Close</button>
            </div>
            <div className="mt-5 flex gap-2">
              {(["MOMO", "CARD"] as const).map(m => (
                <button key={m} type="button" onClick={() => { setWithdrawTab(m); setWithdrawError(null); setWithdrawOk(null); }} className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${withdrawTab === m ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-950/20 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>{m === "MOMO" ? "Mobile Money" : "Visa / Card"}</button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {withdrawTab === "MOMO" ? (
                <>
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-1">Network</div>
                    <div className="flex gap-2">
                      {["MTN", "TELECEL", "AIRTELTIGO"].map(n => (
                        <button key={n} type="button" onClick={() => setWithdrawNetwork(n)} className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold ${withdrawNetwork === n ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-950/20 text-slate-300 hover:border-slate-600"}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-1">Phone Number</div>
                    <input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={withdrawPhone} onChange={e => setWithdrawPhone(e.target.value)} placeholder="+233 24 000 0000" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-1">Amount (GH₵)</div>
                    <input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="e.g. 100" type="number" min="1" />
                  </div>
                </>
              ) : (
                <>
                  <div><div className="mb-1 text-xs font-semibold text-slate-300">Card Number</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 tracking-wider" value={withdrawCardNumber} onChange={e => setWithdrawCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" maxLength={19} /></div>
                  <div><div className="mb-1 text-xs font-semibold text-slate-300">Cardholder Name</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={withdrawCardName} onChange={e => setWithdrawCardName(e.target.value)} placeholder="Name on card" /></div>
                  <div><div className="mb-1 text-xs font-semibold text-slate-300">Expiry (MM/YY)</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={withdrawCardExpiry} onChange={e => setWithdrawCardExpiry(e.target.value)} placeholder="08/27" maxLength={5} /></div>
                  <div><div className="text-xs font-semibold text-slate-300 mb-1">Amount (GH₵)</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="e.g. 100" type="number" min="1" /></div>
                </>
              )}

              {withdrawError && <div className="rounded-lg border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">{withdrawError}</div>}
              {withdrawOk && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{withdrawOk}</div>}
              {withdrawPending && <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200 flex items-start gap-2"><svg className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span>Processing withdrawal — please wait…</span></div>}

              <button disabled={withdrawBusy || !!withdrawPending} className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60" onClick={async () => {
                  setWithdrawError(null); setWithdrawOk(null); setWithdrawPending(null);
                  if (!withdrawAmount || Number(withdrawAmount) <= 0) { setWithdrawError("Enter a valid amount."); return; }
                  if (!selected) { setWithdrawError("No wallet selected."); return; }
                  setWithdrawBusy(true);
                  try {
                    let res: Response;
                    if (withdrawTab === "MOMO") {
                      if (!withdrawPhone.trim()) { setWithdrawError("Enter your phone number."); return; }
                      res = await fetch("/api/withdraw/momo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletId: selected.id, amount: withdrawAmount, phone: withdrawPhone.trim(), network: withdrawNetwork }) });
                    } else {
                      if (!withdrawCardNumber.trim()) { setWithdrawError("Enter your card number."); return; }
                      if (!withdrawCardName.trim()) { setWithdrawError("Enter the cardholder name."); return; }
                      if (!withdrawCardExpiry.trim()) { setWithdrawError("Enter the card expiry."); return; }
                      res = await fetch("/api/withdraw/card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletId: selected.id, amount: withdrawAmount, cardNumber: withdrawCardNumber.trim(), cardName: withdrawCardName.trim(), expiry: withdrawCardExpiry.trim() }) });
                    }
                    const data = await res.json();
                    if (!res.ok) { setWithdrawError(data?.error || "Withdraw failed."); return; }
                    if (data.status === "PENDING" && data.referenceId) {
                      setWithdrawBusy(false);
                      setWithdrawPending(data.referenceId);
                      const poll = async () => {
                        let attempts = 0;
                        const maxAttempts = 30;
                        const intervalId = setInterval(async () => {
                          attempts++;
                          try {
                            const sr = await fetch(`/api/withdraw/momo/status?ref=${data.referenceId}`);
                            const sd = await sr.json();
                            if (sd.status === "COMPLETED") {
                              clearInterval(intervalId);
                              setWithdrawPending(null);
                              setWithdrawOk(sd.message || "Withdrawal completed.");
                              setWithdrawAmount(""); setWithdrawPhone("");
                              await loadWallets();
                            } else if (sd.status === "FAILED" || attempts >= maxAttempts) {
                              clearInterval(intervalId);
                              setWithdrawPending(null);
                              setWithdrawError(sd.message || "Withdrawal failed. Your balance has been refunded.");
                              await loadWallets();
                            }
                          } catch {}
                        }, 5000);
                      };
                      poll();
                      return;
                    }
                    setWithdrawOk(data.message || (withdrawTab === "MOMO" ? `GH₵ ${withdrawAmount} withdrawal submitted via ${withdrawNetwork} MoMo.` : `GH₵ ${withdrawAmount} withdrawal submitted to card ending ${withdrawCardNumber.slice(-4)}.`));
                    setWithdrawAmount(""); setWithdrawPhone(""); setWithdrawCardNumber(""); setWithdrawCardName(""); setWithdrawCardExpiry("");
                    await loadWallets();
                  } catch (e) { setWithdrawError(e instanceof Error ? e.message : "Something went wrong."); } finally { setWithdrawBusy(false); }
              }}>
                {withdrawBusy ? "Processing…" : `Withdraw GH₵ ${withdrawAmount || "0"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BUY/SELL MODALS – unchanged */}
      {(buyOpen || sellOpen) && selected && !isFiat(selected.code) && (
        <div className="fixed inset-0 z-50">
          <button aria-label="Close" onClick={() => { setBuyOpen(false); setSellOpen(false); }} className="absolute inset-0 bg-black/60" />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">{buyOpen ? "BUY" : "SELL"}</div>
                <div className="mt-1 text-lg font-semibold text-white">{selected.name} <span className="text-slate-500">·</span> <span className="text-emerald-300">{selected.code}</span></div>
              </div>
              <button type="button" onClick={() => { setBuyOpen(false); setSellOpen(false); }} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700">Close</button>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold text-white">Amount ({selected.code})</div>
                <input className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-emerald-400 text-white" value={tradeAmountCrypto} onChange={e => setTradeAmountCrypto(e.target.value)} placeholder="e.g. 0.01" />
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-200">
                  Price (placeholder): {buyOpen ? `BUY 1 ${selected.code} = ${STATIC_PRICES[selected.code]?.buy ?? 0} GH₵` : `SELL 1 ${selected.code} = ${STATIC_PRICES[selected.code]?.sell ?? 0} GH₵`}
                </div>
                {tradeError && <div className="mt-3 rounded-lg border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">{tradeError}</div>}
                <div className="mt-3 rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
                  Crypto trading (Buy / Sell) is coming soon. Your GHS wallet will be debited for buys and credited for sells at live GHS rates.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}