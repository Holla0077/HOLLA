"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { WalletCard, formatWalletBalance } from "@/app/app/_components/WalletCard";

type UiWallet = {
  id: string;
  assetId: string;
  code: string;
  name: string;
  type: "FIAT" | "CRYPTO";
  balance: string; // BigInt string
};

type UiTx = {
  id: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  rail: string;
  method: string;
  asset: string;
  amount: string; // BigInt string
  feeTotal: string; // BigInt string
  createdAt: string; // ISO
  metadata: unknown;
};

// ✅ SET THIS ONCE:
// "minor" = pesewas (100.00 -> 10000)
// "major" = cedis   (100.00 -> 100)
const GHS_STORAGE: "minor" | "major" = "minor";

function toBigIntSafe(v: unknown) {
  try {
    return BigInt(String(v));
  } catch {
    return 0n;
  }
}

function formatWithCommas(intStr: string) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatGhs(balanceStr: string) {
  // Returns: "GH₵ 1,234.56"
  if (!balanceStr) return "GH₵ 0.00";

  if (GHS_STORAGE === "major") {
    const n = Number(balanceStr);
    if (!Number.isFinite(n)) return "GH₵ 0.00";
    return `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // minor units
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
  // For now: treat GHS with formatGhs, other assets show raw
  if (asset === "GHS" || asset === "GH₵") return formatGhs(amountStr);
  return amountStr; // later we’ll format crypto decimals per asset
}

function isFiat(code: string) {
  return code === "GHS";
}

function fmtIso(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong";
}

// placeholders (we’ll move to /api/config later)
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

function isGhs(code: string) {
  return code === "GHS" || code === "GH₵";
}

// Convert "BigInt string" (like "0", "150000") into decimals using an assumed scale.
// For GHS you probably store pesewas (2 decimals). Adjust if your DB stores different.
function formatFiatFromMinorUnits(balanceStr: string, currency = "GH₵") {
  const raw = (balanceStr ?? "0").trim();
  const digits = raw.replace(/[^\d-]/g, "") || "0"; // keep numbers only
  const neg = digits.startsWith("-");
  const d = neg ? digits.slice(1) : digits;

  // Ensure at least 3 digits so we can split 2 decimals
  const padded = d.padStart(3, "0");
  const whole = padded.slice(0, -2);
  const frac = padded.slice(-2);

  // add commas to whole part
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

  // Modals that remain
  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  // Fund (topup) form
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

  // Withdraw form
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

  // Buy/Sell
  const [tradeAmountCrypto, setTradeAmountCrypto] = useState("");
  const [tradeError, setTradeError] = useState<string | null>(null);

  // Load wallets (called on mount and after topup/withdraw)
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

  // 0) Load user verification status
  useEffect(() => {
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) setVerifyStatus(d.user.verificationStatus ?? "NONE");
    }).catch(() => {});
  }, []);

  // 1) Load wallets on mount
  useEffect(() => {
    loadWallets(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Load transactions
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setTxsLoading(true);
        const res = await fetch("/api/transactions");
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          if (!alive) return;
          setTxs([]);
          return;
        }
        const data = await res.json();
        if (!alive) return;
        setTxs(Array.isArray(data.transactions) ? data.transactions : []);
      } catch {
        if (!alive) return;
        setTxs([]);
      } finally {
        if (!alive) return;
        setTxsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Filter wallets by CASH/CRYPTO toggle
  const visibleWallets = useMemo(() => {
    if (mode === "cash") return wallets.filter((w) => w.type === "FIAT" || w.code === "GHS");
return wallets.filter((w) => w.type === "CRYPTO" && w.code !== "GHS");

  }, [wallets, mode]);

  // Ensure selected wallet stays within the active mode
  useEffect(() => {
    if (walletsLoading) return;
    if (!visibleWallets.length) {
      setSelectedId(null);
      return;
    }
    const stillVisible = selectedId && visibleWallets.some((w) => w.id === selectedId);
    if (!stillVisible) setSelectedId(visibleWallets[0].id);
  }, [visibleWallets, selectedId, walletsLoading]);

  const selected = useMemo(
    () => visibleWallets.find((w) => w.id === selectedId) ?? null,
    [visibleWallets, selectedId]
  );

  function statusPill(s: UiTx["status"]) {
    if (s === "COMPLETED") return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30";
    if (s === "PENDING") return "bg-yellow-500/10 text-yellow-200 border border-yellow-500/30";
    return "bg-red-500/10 text-red-200 border border-red-500/30";
  }

  // SUMMARY PAGE FONT: make this page modern (keep layout’s serif areas intact)
  // This only affects content rendered inside this page.
  const showVerifyBanner = verifyStatus === "NONE" || verifyStatus === "REJECTED";

  return (
  <div className="relative font-sans">

    {/* VERIFY ACCOUNT BANNER */}
    {showVerifyBanner && (
      <button
        onClick={() => router.push("/app/settings#verification")}
        className="w-full mb-4 flex items-center justify-between gap-3 rounded-[16px] border border-yellow-500/30 bg-yellow-500/10 px-5 py-3.5 text-left hover:bg-yellow-500/15 transition-colors"
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
      <div className="w-full mb-4 flex items-center gap-3 rounded-[16px] border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-left">
        <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-[13px] text-blue-200">Verification under review — we&apos;ll update you within 1–2 business days.</div>
      </div>
    )}

      {/* TOP SECTION */}
      <section className="mt-2">
  <div className="flex items-start justify-between gap-8">
    <div>
      <h1 className="text-[30px] font-semibold tracking-tight text-white">Summary</h1>
      <p className="mt-2 text-[14px] text-slate-200/70">Your balances and activity appear here</p>
      <div className="mt-7 text-[16px] font-semibold text-white/90">My Accounts</div>
    </div>

    <Link
      href="/app/send-receive"
      className="rounded-[18px] bg-emerald-500/90 px-10 py-5 text-[14px] font-semibold text-black shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:bg-emerald-500"
      style={{ lineHeight: 1.05 }}
    >
      SEND /<br /> RECEIVE
    </Link>
  </div>

        {/* ACCOUNTS ROW */}
        <div className="mt-4 flex gap-5 overflow-x-auto pb-2">
          {walletsLoading ? (
            <div className="text-sm text-slate-300/80">Loading wallets…</div>
          ) : visibleWallets.length === 0 ? (
            <div className="text-sm text-slate-300/80">No wallets yet.</div>
          ) : (
            visibleWallets.map((w) => {
              const active = w.id === selectedId;
              return (
                <WalletCard
                  key={w.id}
                  name={w.name}
                  code={w.code}
                  formattedBalance={formatWalletBalance(w.code, w.balance)}
                  active={active}
                  onClick={() => setSelectedId(w.id)}
                />
              );
            })
          )}

          {/* Sketch placeholders in CRYPTO view */}
          {mode === "crypto" &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`ph-${i}`}
                className="min-w-[300px] rounded-[16px] border border-slate-200/40 bg-transparent"
                style={{ height: 120 }}
              />
            ))}
        </div>
      </section>

      {/* LOWER SECTION */}
      <section className="mt-8 grid gap-7 lg:grid-cols-[1.0fr_0.8fr]">
        {/* Selected wallet panel — reduced size */}
        <div className="rounded-[20px] border border-slate-200/40 bg-transparent px-4 py-4">
          {!selected ? (
            <div className="text-[14px] text-slate-300/80">Select a wallet…</div>
          ) : (
            <>
              <div className="text-[13px] text-slate-200/80">Selected wallet</div>
              <div className="mt-1.5 text-[16px] font-semibold text-white">
                {selected.name} <span className="text-emerald-400">* {selected.code}</span>
              </div>

              <div className="mt-5 text-[13px] text-slate-200/80">Balance</div>
              <div className="mt-2 text-[22px] font-semibold leading-none text-emerald-500">
                {selected && isGhs(selected.code)
  ? formatFiatFromMinorUnits(selected.balance, "GH₵")
  : selected?.balance}
 <span className="text-[14px] text-slate-200/80">{selected.code}</span>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1fr] items-start">
                {/* USD balance box */}
                <div className="rounded-[14px] border border-slate-200/40 px-3 py-3">
                  <div className="text-[13px] text-slate-200/80">USD balance</div>
                  <div className="mt-1.5 text-[18px] font-semibold text-white">
                    ${(Number(selected.balance || "0") / 100 / USD_GHS_RATE).toFixed(2)}
                  </div>
                  <div className="mt-2 text-[12px] text-slate-200/70">
                    Rate 1 USD = {USD_GHS_RATE.toFixed(2)} GH₵
                  </div>
                </div>
              

                {/* ACTIONS — buttons reduced ~50% */}
                <div className="space-y-3">
                  {isFiat(selected.code) ? (
                    <>
                     <button
                       type="button"
                       onClick={() => setTopupOpen(true)}
                       className="w-full rounded-[14px] border border-slate-200/60 px-5 py-2.5 text-center text-[14px] font-semibold text-black bg-emerald-500 hover:bg-emerald-600"
                      >
                        FUND WALLET
                      </button>

                      <button
                        onClick={() => {
                          setWithdrawError(null);
                          setWithdrawOpen(true);
                        }}
                        className="w-full rounded-[14px] border border-slate-200/60 bg-emerald-500 px-5 py-2.5 text-center text-[14px] font-semibold text-black hover:bg-emerald-600"
                      >
                        WITHDRAW
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setTradeError(null);
                          setBuyOpen(true);
                        }}
                        className="w-full rounded-[14px] border border-slate-200/60 bg-emerald-500 px-5 py-2.5 text-center text-[15px] font-semibold text-black hover:bg-emerald-600"
                      >
                        BUY
                      </button>

                      <button
                        onClick={() => {
                          setTradeError(null);
                          setSellOpen(true);
                        }}
                        className="w-full rounded-[14px] border border-slate-200/60 bg-emerald-500 px-5 py-2.5 text-center text-[15px] font-semibold text-black hover:bg-emerald-600"
                      >
                        SELL
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-[30px] border border-slate-200/40 bg-transparent px-7 py-7">
          <div className="flex items-center justify-between">
            <div className="text-[18px] font-semibold text-white">Recent Activity</div>
            <Link href="/app/activity" className="text-[14px] text-emerald-400 hover:text-emerald-300">
              View all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {txsLoading ? (
              <div className="text-[14px] text-slate-300/80">Loading…</div>
            ) : txs.length === 0 ? (
              <div className="text-[14px] text-slate-300/80">No transactions yet.</div>
            ) : (
              txs.slice(0, 6).map((t) => (
                <div key={t.id} className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[14px] font-semibold text-white">
                      {t.asset} <span className="text-slate-200/70">·</span>{" "}
                      <span className="text-emerald-300">{t.method}</span>
                    </div>
                    <span className={["text-[11px] px-3 py-1 rounded-full", statusPill(t.status)].join(" ")}>
                      {t.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[12px]">
                    <span className="text-slate-200/70">{fmtIso(t.createdAt)}</span>
                    <span className="font-semibold text-white">{formatTxAmount(t.amount, t.asset)}
</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      
      {/* FUND (TOP UP) MODAL */}
      {topupOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close"
            onClick={() => { setTopupOpen(false); setTopupOk(null); setTopupError(null); }}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Fund Wallet</div>
                <div className="mt-1 text-lg font-semibold text-white">Deposit GH₵</div>
              </div>
              <button
                type="button"
                onClick={() => { setTopupOpen(false); setTopupOk(null); setTopupError(null); }}
                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700"
              >
                Close
              </button>
            </div>

            {/* Method tabs */}
            <div className="mt-5 flex gap-2">
              {(["MOMO", "CARD"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setFundMethod(m); setTopupError(null); setTopupOk(null); }}
                  className={[
                    "flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors",
                    fundMethod === m
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 bg-slate-950/20 text-slate-400 hover:border-slate-600 hover:text-slate-200",
                  ].join(" ")}
                >
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
                      {["MTN", "TELECEL", "AIRTELTIGO"].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setTopupNetwork(n)}
                          className={[
                            "flex-1 rounded-lg border px-2 py-2 text-xs font-semibold",
                            topupNetwork === n
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : "border-slate-700 bg-slate-950/20 text-slate-300 hover:border-slate-600",
                          ].join(" ")}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Phone Number</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={topupPhone}
                      onChange={(e) => setTopupPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Amount (GH₵)</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="e.g. 100"
                      type="number"
                      min="1"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Card Number</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 tracking-wider"
                      value={topupCardNumber}
                      onChange={(e) => setTopupCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Cardholder Name</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={topupCardName}
                      onChange={(e) => setTopupCardName(e.target.value)}
                      placeholder="Name on card"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 text-xs font-semibold text-slate-300">Expiry (MM/YY)</div>
                      <input
                        className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                        value={topupCardExpiry}
                        onChange={(e) => setTopupCardExpiry(e.target.value)}
                        placeholder="08/27"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-semibold text-slate-300">CVV</div>
                      <input
                        className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                        value={topupCardCvv}
                        onChange={(e) => setTopupCardCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        type="password"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Amount (GH₵)</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="e.g. 100"
                      type="number"
                      min="1"
                    />
                  </div>
                </>
              )}

              {topupError && (
                <div className="rounded-lg border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {topupError}
                </div>
              )}
              {topupOk && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  {topupOk}
                </div>
              )}

              <button
                disabled={topupBusy}
                className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
                onClick={async () => {
                  setTopupError(null);
                  setTopupOk(null);
                  if (!topupAmount || Number(topupAmount) <= 0) { setTopupError("Enter a valid amount."); return; }
                  if (!selected) { setTopupError("No wallet selected."); return; }
                  setTopupBusy(true);
                  try {
                    let res: Response;
                    if (fundMethod === "MOMO") {
                      if (!topupPhone.trim()) { setTopupError("Enter your phone number."); return; }
                      res = await fetch("/api/topup/momo", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ walletId: selected.id, amount: topupAmount, phone: topupPhone.trim(), network: topupNetwork }),
                      });
                    } else {
                      if (!topupCardNumber.trim()) { setTopupError("Enter your card number."); return; }
                      if (!topupCardName.trim()) { setTopupError("Enter the cardholder name."); return; }
                      if (!topupCardExpiry.trim()) { setTopupError("Enter the card expiry."); return; }
                      if (!topupCardCvv.trim()) { setTopupError("Enter the CVV."); return; }
                      res = await fetch("/api/topup/card", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          walletId: selected.id,
                          amount: topupAmount,
                          cardNumber: topupCardNumber.trim(),
                          cardName: topupCardName.trim(),
                          expiry: topupCardExpiry.trim(),
                          cvv: topupCardCvv.trim(),
                        }),
                      });
                    }
                    const data = await res.json();
                    if (!res.ok) { setTopupError(data?.error || "Top up failed."); return; }
                    setTopupOk(fundMethod === "MOMO"
                      ? `GH₵ ${topupAmount} credited to your wallet via ${topupNetwork} MoMo.`
                      : `GH₵ ${topupAmount} credited to your wallet via card ending ${topupCardNumber.slice(-4)}.`
                    );
                    setTopupAmount("");
                    setTopupPhone("");
                    setTopupCardNumber("");
                    setTopupCardName("");
                    setTopupCardExpiry("");
                    setTopupCardCvv("");
                    await loadWallets();
                  } catch (e) {
                    setTopupError(e instanceof Error ? e.message : "Something went wrong.");
                  } finally {
                    setTopupBusy(false);
                  }
                }}
              >
                {topupBusy ? "Processing…" : `Fund Wallet — GH₵ ${topupAmount || "0"}`}
              </button>
            </div>
          </div>
        </div>
      )}

{/* WITHDRAW MODAL (GH₵ only) */}
      {withdrawOpen && selected && isFiat(selected.code) && (
        <div className="fixed inset-0 z-50">
          <button aria-label="Close" onClick={() => { setWithdrawOpen(false); setWithdrawOk(null); setWithdrawError(null); }} className="absolute inset-0 bg-black/60" />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Withdraw</div>
                <div className="mt-1 text-lg font-semibold text-white">Withdraw GH₵</div>
              </div>
              <button
                type="button"
                onClick={() => { setWithdrawOpen(false); setWithdrawOk(null); setWithdrawError(null); }}
                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700"
              >
                Close
              </button>
            </div>

            {/* Method tabs */}
            <div className="mt-5 flex gap-2">
              {(["MOMO", "CARD"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setWithdrawTab(m); setWithdrawError(null); setWithdrawOk(null); }}
                  className={[
                    "flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors",
                    withdrawTab === m
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 bg-slate-950/20 text-slate-400 hover:border-slate-600 hover:text-slate-200",
                  ].join(" ")}
                >
                  {m === "MOMO" ? "Mobile Money" : "Visa / Card"}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {withdrawTab === "MOMO" ? (
                <>
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-1">Network</div>
                    <div className="flex gap-2">
                      {["MTN", "TELECEL", "AIRTELTIGO"].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setWithdrawNetwork(n)}
                          className={[
                            "flex-1 rounded-lg border px-2 py-2 text-xs font-semibold",
                            withdrawNetwork === n
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : "border-slate-700 bg-slate-950/20 text-slate-300 hover:border-slate-600",
                          ].join(" ")}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-1">Phone Number</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-1">Amount (GH₵)</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="e.g. 100"
                      type="number"
                      min="1"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Card Number</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 tracking-wider"
                      value={withdrawCardNumber}
                      onChange={(e) => setWithdrawCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Cardholder Name</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={withdrawCardName}
                      onChange={(e) => setWithdrawCardName(e.target.value)}
                      placeholder="Name on card"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Expiry (MM/YY)</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={withdrawCardExpiry}
                      onChange={(e) => setWithdrawCardExpiry(e.target.value)}
                      placeholder="08/27"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-1">Amount (GH₵)</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="e.g. 100"
                      type="number"
                      min="1"
                    />
                  </div>
                </>
              )}

              {withdrawError && (
                <div className="rounded-lg border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {withdrawError}
                </div>
              )}
              {withdrawOk && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  {withdrawOk}
                </div>
              )}
              <button
                disabled={withdrawBusy}
                className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
                onClick={async () => {
                  setWithdrawError(null);
                  setWithdrawOk(null);
                  if (!withdrawAmount || Number(withdrawAmount) <= 0) { setWithdrawError("Enter a valid amount."); return; }
                  if (!selected) { setWithdrawError("No wallet selected."); return; }
                  setWithdrawBusy(true);
                  try {
                    let res: Response;
                    if (withdrawTab === "MOMO") {
                      if (!withdrawPhone.trim()) { setWithdrawError("Enter your phone number."); return; }
                      res = await fetch("/api/withdraw/momo", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ walletId: selected.id, amount: withdrawAmount, phone: withdrawPhone.trim(), network: withdrawNetwork }),
                      });
                    } else {
                      if (!withdrawCardNumber.trim()) { setWithdrawError("Enter your card number."); return; }
                      if (!withdrawCardName.trim()) { setWithdrawError("Enter the cardholder name."); return; }
                      if (!withdrawCardExpiry.trim()) { setWithdrawError("Enter the card expiry."); return; }
                      res = await fetch("/api/withdraw/card", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          walletId: selected.id,
                          amount: withdrawAmount,
                          cardNumber: withdrawCardNumber.trim(),
                          cardName: withdrawCardName.trim(),
                          expiry: withdrawCardExpiry.trim(),
                        }),
                      });
                    }
                    const data = await res.json();
                    if (!res.ok) { setWithdrawError(data?.error || "Withdraw failed."); return; }
                    setWithdrawOk(withdrawTab === "MOMO"
                      ? `GH₵ ${withdrawAmount} withdrawal submitted via ${withdrawNetwork} MoMo. Funds will arrive shortly.`
                      : `GH₵ ${withdrawAmount} withdrawal submitted to card ending ${withdrawCardNumber.slice(-4)}. Funds will arrive in 1–3 business days.`
                    );
                    setWithdrawAmount("");
                    setWithdrawPhone("");
                    setWithdrawCardNumber("");
                    setWithdrawCardName("");
                    setWithdrawCardExpiry("");
                    await loadWallets();
                  } catch (e) {
                    setWithdrawError(e instanceof Error ? e.message : "Something went wrong.");
                  } finally {
                    setWithdrawBusy(false);
                  }
                }}
              >
                {withdrawBusy ? "Processing…" : `Withdraw GH₵ ${withdrawAmount || "0"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BUY/SELL MODALS */}
      {(buyOpen || sellOpen) && selected && !isFiat(selected.code) && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close"
            onClick={() => {
              setBuyOpen(false);
              setSellOpen(false);
            }}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">{buyOpen ? "BUY" : "SELL"}</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {selected.name} <span className="text-slate-500">·</span>{" "}
                  <span className="text-emerald-300">{selected.code}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBuyOpen(false);
                  setSellOpen(false);
                }}
                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold text-white">Amount ({selected.code})</div>
                <input
                  className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-emerald-400 text-white"
                  value={tradeAmountCrypto}
                  onChange={(e) => setTradeAmountCrypto(e.target.value)}
                  placeholder="e.g. 0.01"
                />

                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-200">
                  Price (placeholder):{" "}
                  {buyOpen
                    ? `BUY 1 ${selected.code} = ${STATIC_PRICES[selected.code]?.buy ?? 0} GH₵`
                    : `SELL 1 ${selected.code} = ${STATIC_PRICES[selected.code]?.sell ?? 0} GH₵`}
                </div>

                {tradeError && (
                  <div className="mt-3 rounded-lg border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {tradeError}
                  </div>
                )}

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