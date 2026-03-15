"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  const sp = useSearchParams();
  const mode = (sp.get("mode") || "cash").toLowerCase() === "crypto" ? "crypto" : "cash";

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

  // Withdraw form
  const [withdrawMethod, setWithdrawMethod] = useState<"CARD" | "MOMO" | "BANK" | "MERCHANT">("MOMO");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawNetwork, setWithdrawNetwork] = useState("MTN");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawOk, setWithdrawOk] = useState<string | null>(null);

  // Topup momo form
  const [topupStep, setTopupStep] = useState<"METHOD" | "MOMO">("METHOD");
  const [topupPhone, setTopupPhone] = useState("");
  const [topupNetwork, setTopupNetwork] = useState("MTN");
  const [topupAmount, setTopupAmount] = useState("");
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupOk, setTopupOk] = useState<string | null>(null);

  // Buy/Sell
  const [tradeAmountCrypto, setTradeAmountCrypto] = useState("");
  const [tradeError, setTradeError] = useState<string | null>(null);

  // 1) Load wallets
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setWalletsLoading(true);
        setWalletsError(null);

        const res = await fetch("/api/wallets");
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Server did not return JSON. Status=${res.status}. Body: ${text.slice(0, 120)}`);
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load wallets");

        if (!alive) return;
        setWallets(Array.isArray(data.wallets) ? data.wallets : []);
      } catch (e: unknown) {
        if (!alive) return;
        setWalletsError(getErrorMessage(e));
      } finally {
        if (!alive) return;
        setWalletsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
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
  return (
  <div className="relative font-sans">

    

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
                        TOPUP / DEPOSIT
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
      
      {/* TOP UP MODAL */}
      {topupOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close"
            onClick={() => { setTopupOpen(false); setTopupStep("METHOD"); setTopupOk(null); setTopupError(null); }}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Top Up</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {topupStep === "METHOD" ? "Choose funding method" : "Mobile Money (MoMo)"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setTopupOpen(false); setTopupStep("METHOD"); setTopupOk(null); setTopupError(null); }}
                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700"
              >
                Close
              </button>
            </div>

            {topupStep === "METHOD" ? (
              <div className="mt-5 grid gap-3">
                {[
                  { key: "MOMO", label: "Mobile Money (MoMo)" },
                  { key: "CARD", label: "Card (coming soon)", disabled: true },
                  { key: "BANK", label: "Bank Transfer (coming soon)", disabled: true },
                  { key: "MERCHANT", label: "Merchant (coming soon)", disabled: true },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    disabled={m.disabled}
                    onClick={() => { if (!m.disabled) setTopupStep("MOMO"); }}
                    className={[
                      "w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors",
                      m.disabled
                        ? "border-slate-800 bg-slate-950/20 text-slate-500 cursor-not-allowed"
                        : "border-slate-700 bg-slate-900/30 text-slate-100 hover:border-emerald-500 hover:text-emerald-200",
                    ].join(" ")}
                  >
                    {m.label}
                  </button>
                ))}
                <div className="mt-2 text-xs text-slate-400">
                  Top Up adds funds to your wallet.
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="grid gap-3">
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
                      placeholder="+233..."
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-slate-300">Amount (GH₵)</div>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="e.g. 100"
                    />
                  </div>

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
                    className="mt-1 w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
                    onClick={async () => {
                      setTopupError(null);
                      setTopupOk(null);
                      if (!topupPhone.trim()) { setTopupError("Enter your phone number."); return; }
                      if (!topupAmount || Number(topupAmount) <= 0) { setTopupError("Enter a valid amount."); return; }
                      if (!selected) { setTopupError("No wallet selected."); return; }
                      setTopupBusy(true);
                      try {
                        const res = await fetch("/api/topup/momo", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ walletId: selected.id, amount: topupAmount, phone: topupPhone.trim(), network: topupNetwork }),
                        });
                        const data = await res.json();
                        if (!res.ok) { setTopupError(data?.error || "Top up failed."); return; }
                        setTopupOk("Top up request submitted! Funds will reflect once confirmed.");
                        setTopupAmount("");
                        setTopupPhone("");
                      } catch (e) {
                        setTopupError(e instanceof Error ? e.message : "Something went wrong.");
                      } finally {
                        setTopupBusy(false);
                      }
                    }}
                  >
                    {topupBusy ? "Submitting…" : "Confirm Top Up"}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTopupStep("METHOD"); setTopupError(null); setTopupOk(null); }}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-300"
                  >
                    ← Back to methods
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

{/* WITHDRAW MODAL (GH₵ only) */}
      {withdrawOpen && selected && isFiat(selected.code) && (
        <div className="fixed inset-0 z-50">
          <button aria-label="Close" onClick={() => setWithdrawOpen(false)} className="absolute inset-0 bg-black/60" />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Withdraw</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Ghana Cedi <span className="text-slate-500">·</span>{" "}
                  <span className="text-emerald-300">GH₵</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawOpen(false)}
                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold text-white">Method</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(["MOMO", "CARD", "BANK", "MERCHANT"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={m !== "MOMO"}
                      onClick={() => setWithdrawMethod(m)}
                      className={[
                        "rounded-lg border px-3 py-2 text-sm font-semibold",
                        m !== "MOMO" ? "border-slate-800 bg-slate-950/20 text-slate-500 cursor-not-allowed" :
                        withdrawMethod === m
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border-slate-800 bg-slate-950/20 text-slate-200 hover:border-slate-700",
                      ].join(" ")}
                    >
                      {m === "MOMO" ? "Mobile Money" : `${m} (soon)`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-3">
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
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-emerald-400 text-white"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                    placeholder="+233..."
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-1">Amount (GH₵)</div>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-emerald-400 text-white"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="e.g. 100"
                  />
                </div>
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
                    if (!withdrawPhone.trim()) { setWithdrawError("Enter your phone number."); return; }
                    if (!withdrawAmount || Number(withdrawAmount) <= 0) { setWithdrawError("Enter a valid amount."); return; }
                    if (!selected) { setWithdrawError("No wallet selected."); return; }
                    setWithdrawBusy(true);
                    try {
                      const res = await fetch("/api/withdraw/momo", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ walletId: selected.id, amount: withdrawAmount, phone: withdrawPhone.trim(), network: withdrawNetwork }),
                      });
                      const data = await res.json();
                      if (!res.ok) { setWithdrawError(data?.error || "Withdraw failed."); return; }
                      setWithdrawOk("Withdraw submitted! Funds will be sent shortly.");
                      setWithdrawAmount("");
                      setWithdrawPhone("");
                    } catch (e) {
                      setWithdrawError(e instanceof Error ? e.message : "Something went wrong.");
                    } finally {
                      setWithdrawBusy(false);
                    }
                  }}
                >
                  {withdrawBusy ? "Submitting…" : "Confirm Withdraw"}
                </button>
              </div>
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

                <button
                  className="mt-3 w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-600"
                  onClick={() => alert("Next: /api/buy and /api/sell with ledger + fee rules.")}
                >
                  Confirm {buyOpen ? "Buy" : "Sell"}
                </button>

                <div className="mt-2 text-xs text-slate-500">
                  Uses Ghana Cedis wallet for BUY; credits Ghana Cedis wallet for SELL.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}