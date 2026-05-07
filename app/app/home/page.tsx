"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

const monthlySpendingData = [120, 80, 200, 150, 180, 220, 240, 260, 280, 300, 320, 340];
const currentMonthSpending = 2340;
const lastMonthSpending = 1918;
const spendingDifference = currentMonthSpending - lastMonthSpending;
const spendingPercentage = ((spendingDifference / lastMonthSpending) * 100).toFixed(0);
const spendingChartData = [
  { date: '1 May',  amount: 1200 },
  { date: '8 May',  amount: 2100 },
  { date: '15 May', amount: 2900 },
  { date: '22 May', amount: 3700 },
  { date: '30 May', amount: 4400 },
];

export default function HomePage() {
  const router = useRouter();

  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [wallets, setWallets] = useState<UiWallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [txs, setTxs] = useState<UiTx[]>([]);
  const [txsLoading, setTxsLoading] = useState(true);

  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [sendMoneyOpen, setSendMoneyOpen] = useState(false);
  const [receiveMoneyOpen, setReceiveMoneyOpen] = useState(false);
  const [payMerchantOpen, setPayMerchantOpen] = useState(false);

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

  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);

  const [meUser, setMeUser] = useState<{ username?: string; email?: string; phone?: string; fullName?: string; isVerified?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user) {
          setVerifyStatus(d.user.verificationStatus ?? "NONE");
          setMeUser(d.user);
        }
      })
      .catch(() => {});
  }, []);

  async function loadWallets(showSpinner = false) {
    try {
      if (showSpinner) setWalletsLoading(true);
      setWalletsLoading(true);
      const res = await fetch("/api/wallets");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load wallets");
      setWallets(Array.isArray(data.wallets) ? data.wallets : []);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setWalletsLoading(false);
    }
  }

  useEffect(() => { loadWallets(true); }, []);

  useEffect(() => {
    (async () => {
      setTxsLoading(true);
      const res = await fetch("/api/transactions");
      const data = await res.json();
      if (res.ok) setTxs(Array.isArray(data.transactions) ? data.transactions : []);
      setTxsLoading(false);
    })();
  }, []);

  const ghsWallet = useMemo(() => wallets.find(w => w.code === "GHS") ?? null, [wallets]);

  const showVerifyBanner = verifyStatus === "NONE" || verifyStatus === "REJECTED";

  function statusPill(s: UiTx["status"]) {
    if (s === "COMPLETED") return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium";
    if (s === "PENDING") return "bg-yellow-500/10 text-yellow-200 border border-yellow-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium";
    return "bg-red-500/10 text-red-200 border border-red-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium";
  }

  async function handleSendMoney() {
    setSendError(null); setSendOk(null);
    if (!sendRecipient.trim()) { setSendError("Enter recipient username, email, or phone"); return; }
    if (!sendAmount || Number(sendAmount) <= 0) { setSendError("Enter a valid amount"); return; }
    if (!ghsWallet) { setSendError("No GHS wallet found"); return; }
    setSendBusy(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIdentifier: sendRecipient.trim(),
          assetCode: "GHS",
          amount: sendAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      setSendOk(`Sent GH₵ ${sendAmount} to ${sendRecipient}`);
      setSendRecipient(""); setSendAmount("");
      await loadWallets();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setSendBusy(false);
    }
  }

  const graphMax = Math.max(...monthlySpendingData, 10);
  const barWidth = 100 / monthlySpendingData.length;

  return (
    <div className="min-h-screen bg-[#070B1A] text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {showVerifyBanner && (
          <button onClick={() => router.push("/app/settings#verification")} className="w-full mb-6 flex items-center justify-between gap-3 rounded-[16px] border border-yellow-500/30 bg-yellow-500/10 px-5 py-3.5 text-left hover:bg-yellow-500/15 transition-colors">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <div className="text-[13px] font-semibold text-yellow-200">{verifyStatus === "REJECTED" ? "Verification Rejected — Resubmit" : "Verify Account"}</div>
                <div className="text-[12px] text-yellow-200/60">{verifyStatus === "REJECTED" ? "Your documents were rejected. Click to resubmit your Ghana Card." : "Complete identity verification to unlock sending, withdrawals and more."}</div>
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

        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-slate-400 mt-1 text-sm">
              Welcome back{meUser?.fullName ? `, ${meUser.fullName.split(' ')[0]}` : ""}
            </p>
          </div>
        </div>

        {/* ---------- GHS + MINI-WALLETS + QUICK ACTIONS + REFER & EARN (responsive grid) ---------- */}
<div className="grid grid-cols-12 gap-6 mb-8">

  {/* ── ROW 1 ── */}
  {/* GHS Balance Card – full width on mobile, 5 cols on lg */}
  <div className="col-span-12 lg:col-span-5 relative overflow-hidden rounded-[22px] border border-slate-200/20 bg-slate-950/40 backdrop-blur-sm py-12 px-8 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
    <div className="pointer-events-none absolute right-4 top-2 text-[140px] font-black text-white/5 leading-none select-none">
      ₵
    </div>
    <div className="relative flex flex-col items-start text-left">
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Balance</div>
        <div className="text-4xl font-bold text-white">
          {ghsWallet
            ? formatFiatFromMinorUnits(ghsWallet.balance, "GH₵")
            : "GH₵ 0.00"}
        </div>
        <div className="text-sm text-slate-400">
          ≈ ${(Number(ghsWallet?.balance || "0") / 100 / USD_GHS_RATE).toFixed(2)} USD
        </div>
      </div>
      <div className="flex gap-3 w-full mt-8">
        <button onClick={() => setTopupOpen(true)} className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)]">
          Fund Wallet
        </button>
        <button onClick={() => { setWithdrawError(null); setWithdrawOpen(true); }} className="flex-1 rounded-xl border border-slate-600 bg-transparent px-4 py-3 text-sm font-semibold text-white hover:border-slate-500 transition-colors">
          Withdraw
        </button>
      </div>
    </div>
  </div>

  {/* Three mini‑wallets – full width on mobile, 7 cols on lg, fixed height only on lg */}
  <div className="col-span-12 lg:col-span-7 flex flex-col sm:flex-row gap-4 self-start lg:h-40">
    {/* Crypto */}
    <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 flex flex-col items-start justify-between">
      <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-2xl">₿</div>
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wider">Crypto Wallet</div>
        {(() => {
          const cryptoWallets = wallets.filter(w => w.type === "CRYPTO" && w.code !== "GHS");
          const totalCryptoValue = cryptoWallets.reduce((sum, w) => sum + toBigIntSafe(w.balance), 0n);
          return (
            <>
              <div className="text-lg font-bold text-white mt-1">
                {formatFiatFromMinorUnits(totalCryptoValue.toString(), "GH₵")}
              </div>
              <div className="text-xs text-slate-400">
                ≈ ${(Number(totalCryptoValue) / 100 / USD_GHS_RATE).toFixed(2)} USD
              </div>
            </>
          );
        })()}
      </div>
    </div>

    {/* Card */}
    <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 flex flex-col items-start justify-between">
      <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl">💳</div>
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wider">Card Wallet</div>
        <div className="text-lg font-bold text-white mt-1">Coming Soon</div>
        <div className="text-xs text-slate-400">Physical & virtual cards</div>
      </div>
    </div>

    {/* KASH Points */}
    <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 flex flex-col items-start justify-between">
      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">⭐</div>
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wider">KASH Points</div>
        <div className="text-lg font-bold text-white mt-1">2,450 PTS</div>
        <div className="text-xs text-slate-400">Earn more by referring friends</div>
      </div>
    </div>
  </div>

  {/* ── ROW 2 ── */}
  {/* Quick Actions – full width on mobile, 8 cols on lg */}
  <div className="col-span-12 lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 self-start mt-0">
    <div className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Quick Actions</div>
    <div className="grid grid-cols-3 gap-4">
      <button onClick={() => setSendMoneyOpen(true)} className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/30 p-4 hover:border-emerald-500/30 transition-colors">
        <svg className="w-6 h-6 text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        <span className="text-xs font-medium text-white">Send Money</span>
      </button>
      <button onClick={() => setReceiveMoneyOpen(true)} className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/30 p-4 hover:border-emerald-500/30 transition-colors">
        <svg className="w-6 h-6 text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
        </svg>
        <span className="text-xs font-medium text-white">Receive Money</span>
      </button>
      <button onClick={() => setPayMerchantOpen(true)} className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/30 p-4 hover:border-emerald-500/30 transition-colors">
        <svg className="w-6 h-6 text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <span className="text-xs font-medium text-white">Pay Merchant</span>
      </button>
    </div>
  </div>

  {/* Refer & Earn – full width on mobile, 4 cols on lg, pulled up only on lg */}
  <Link
    href="/app/referrals"
    className="col-span-12 lg:col-span-4 group relative rounded-2xl border border-slate-800 overflow-hidden block lg:-mt-28 h-48 lg:h-auto"
  >
    <Image
      src="/images/refer-earn.png"
      alt="Refer and Earn"
      fill
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      priority
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
  </Link>
</div>
        {/* RECENT TRANSACTIONS & SPENDING OVERVIEW (top-aligned) */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] mb-8 items-start">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 h-auto lg:h-[40rem] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold uppercase tracking-wider text-white">Recent Transactions</div>
              <Link href="/app/activity" className="text-xs text-emerald-400 hover:text-emerald-300">View All</Link>
            </div>
            <div className="space-y-4">
              {txsLoading ? (
                <div className="text-sm text-slate-400">Loading…</div>
              ) : txs.length === 0 ? (
                <div className="text-sm text-slate-500">No transactions yet.</div>
              ) : (
                txs.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-emerald-300">
                        {t.method?.charAt(0) || "T"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{t.method || t.rail}</div>
                        <div className="text-xs text-slate-400">{t.asset} · {fmtIso(t.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${t.amount.startsWith("-") ? "text-red-400" : "text-emerald-400"}`}>
                        {t.amount.startsWith("-") ? t.amount : "+" + t.amount} {t.asset}
                      </div>
                      <span className={statusPill(t.status)}>{t.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Spending Overview – redesigned area chart */}
<div className="rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 h-[28rem] flex flex-col">
  {/* Top bar: title + dropdown */}
  <div className="flex items-center justify-between mb-2">
    <div>
      <div className="text-sm font-semibold uppercase tracking-wider text-white">Spending Overview</div>
      <div className="text-xs text-slate-400 mt-0.5">This Month</div>
    </div>
    <div className="relative">
      <select className="appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-white outline-none focus:border-emerald-400 cursor-pointer">
        <option>This Month</option>
        <option>Last Month</option>
        <option>Last 3 Months</option>
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>

  {/* Main value & percentage */}
  <div className="flex items-baseline gap-3 mb-1">
    <div className="text-2xl font-bold text-white">GHS 2,340.00</div>
    <div className="flex items-center text-sm text-emerald-400">
      <svg className="w-4 h-4 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
      12% from last month
    </div>
  </div>

  {/* Area Chart */}
<div className="flex-1 w-full min-w-0 pt-4 -ml-4 sm:ml-0">
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart
      data={spendingChartData}
      margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
    >
      <defs>
        <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
        </linearGradient>
      </defs>

      <CartesianGrid
        vertical={false}
        stroke="rgba(148, 163, 184, 0.15)"
        strokeDasharray="0"
      />

      <XAxis
        dataKey="date"
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#94a3b8', fontSize: 10 }}
        interval={0}
      />

      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#94a3b8', fontSize: 10 }}
        domain={[0, 5000]}
        ticks={[1000, 3000, 5000]}
        tickFormatter={(v) => `${v / 1000}k`}
      />

      <Area
        type="monotone"
        dataKey="amount"
        stroke="#10b981"
        strokeWidth={2}
        fill="url(#spendingGradient)"
        dot={false}
      />
    </AreaChart>
  </ResponsiveContainer>
</div>
</div>

                </div> {/* end of grid container */}

        {/* GET THE KASHBOY APP BANNER – full width */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/60 to-slate-900/20 backdrop-blur-md px-6 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-700 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">Get the KASHBOY App</div>
              <p className="text-xs text-slate-400">Banking in your pocket. Download now.</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-gray-200 transition-colors">App Store</button>
            <button className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-gray-200 transition-colors">Google Play</button>
          </div>
        </div>
      </div> {/* this closes the outer max-w-7xl container */}

      {/* SEND MONEY MODAL */}
      {sendMoneyOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSendMoneyOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="text-lg font-semibold text-white">Send Money</div>
              <button onClick={() => setSendMoneyOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              <input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" placeholder="Recipient username, email, or phone" value={sendRecipient} onChange={e => setSendRecipient(e.target.value)} />
              <input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" placeholder="Amount (GH₵)" type="number" min="1" value={sendAmount} onChange={e => setSendAmount(e.target.value)} />
              {sendError && <div className="text-red-400 text-sm">{sendError}</div>}
              {sendOk && <div className="text-emerald-400 text-sm">{sendOk}</div>}
              <button onClick={handleSendMoney} disabled={sendBusy} className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60">
                {sendBusy ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE MONEY MODAL */}
      {receiveMoneyOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setReceiveMoneyOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="text-lg font-semibold text-white">Receive Money</div>
              <button onClick={() => setReceiveMoneyOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-sm text-slate-400 mb-4">Share your details to receive GHS</p>
            <div className="space-y-3">
              {["Username", "Email", "Phone"].map(label => {
                const val = meUser?.[label.toLowerCase() as keyof typeof meUser] || "—";
                return (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/40 px-4 py-3">
                    <span className="text-sm text-slate-300">{label}</span>
                    <span className="text-sm font-medium text-white">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAY MERCHANT MODAL */}
      {payMerchantOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPayMerchantOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="text-lg font-semibold text-white">Pay Merchant</div>
              <button onClick={() => setPayMerchantOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 mb-4" placeholder="Enter Merchant ID or scan QR" />
            <button className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-600">Pay</button>
            <p className="text-xs text-slate-500 mt-2 text-center">QR scanner coming soon</p>
          </div>
        </div>
      )}

      {/* TOPUP MODAL */}
      {topupOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setTopupOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Fund Wallet</div>
                <div className="mt-1 text-lg font-semibold text-white">Deposit GH₵</div>
              </div>
              <button type="button" onClick={() => setTopupOpen(false)} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700">Close</button>
            </div>
            <div className="mt-5 flex gap-2">
              {(["MOMO", "CARD"] as const).map(m => (
                <button key={m} type="button" onClick={() => setFundMethod(m)} className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${fundMethod === m ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-950/20 text-slate-400"}`}>
                  {m === "MOMO" ? "Mobile Money" : "Visa / Card"}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {fundMethod === "MOMO" ? (
                <>
                  <div><div className="text-xs font-semibold text-slate-300 mb-1">Network</div><div className="flex gap-2">{["MTN","TELECEL","AIRTELTIGO"].map(n=><button key={n} onClick={()=>setTopupNetwork(n)} className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold ${topupNetwork===n?"border-emerald-500/40 bg-emerald-500/10 text-emerald-200":"border-slate-700 bg-slate-950/20 text-slate-300"}`}>{n}</button>)}</div></div>
                  <div><div className="text-xs font-semibold text-slate-300 mb-1">Phone Number</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupPhone} onChange={e=>setTopupPhone(e.target.value)} placeholder="+233 24 000 0000" /></div>
                  <div><div className="text-xs font-semibold text-slate-300 mb-1">Amount (GH₵)</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupAmount} onChange={e=>setTopupAmount(e.target.value)} placeholder="e.g. 100" type="number" min="1" /></div>
                </>
              ) : (
                <>
                  <div><div className="text-xs font-semibold text-slate-300">Card Number</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 tracking-wider" value={topupCardNumber} onChange={e=>setTopupCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" maxLength={19} /></div>
                  <div><div className="text-xs font-semibold text-slate-300">Cardholder Name</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupCardName} onChange={e=>setTopupCardName(e.target.value)} placeholder="Name on card" /></div>
                  <div className="grid grid-cols-2 gap-3"><div><div className="text-xs font-semibold text-slate-300">Expiry (MM/YY)</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupCardExpiry} onChange={e=>setTopupCardExpiry(e.target.value)} placeholder="08/27" maxLength={5} /></div><div><div className="text-xs font-semibold text-slate-300">CVV</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupCardCvv} onChange={e=>setTopupCardCvv(e.target.value)} placeholder="123" maxLength={4} type="password" /></div></div>
                  <div><div className="text-xs font-semibold text-slate-300">Amount (GH₵)</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={topupAmount} onChange={e=>setTopupAmount(e.target.value)} placeholder="e.g. 100" type="number" min="1" /></div>
                </>
              )}
              {topupError && <div className="rounded-lg border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">{topupError}</div>}
              {topupOk && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{topupOk}</div>}
              {topupPending && <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">Waiting for approval...</div>}
              <button disabled={topupBusy} className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60" onClick={async()=>{
                  setTopupError(null); setTopupOk(null);
                  if(!topupAmount || Number(topupAmount)<=0) { setTopupError("Enter a valid amount."); return; }
                  if(!ghsWallet) { setTopupError("No GHS wallet found."); return; }
                  setTopupBusy(true);
                  try {
                    const res = fundMethod==="MOMO"
                      ? await fetch("/api/topup/momo", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ walletId: ghsWallet.id, amount: topupAmount, phone: topupPhone, network: topupNetwork }) })
                      : await fetch("/api/topup/card", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ walletId: ghsWallet.id, amount: topupAmount, cardNumber:topupCardNumber, cardName:topupCardName, expiry:topupCardExpiry, cvv:topupCardCvv }) });
                    const data = await res.json();
                    if(!res.ok) { setTopupError(data?.error||"Top up failed."); return; }
                    setTopupOk(data.message || "Wallet funded successfully.");
                    setTopupAmount(""); setTopupPhone(""); setTopupCardNumber(""); setTopupCardName(""); setTopupCardExpiry(""); setTopupCardCvv("");
                    await loadWallets();
                  } catch(e) { setTopupError(e instanceof Error ? e.message : "Something went wrong."); } finally { setTopupBusy(false); }
              }}>Fund Wallet</button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {withdrawOpen && ghsWallet && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setWithdrawOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-xs text-slate-400">Withdraw</div><div className="mt-1 text-lg font-semibold text-white">Withdraw GH₵</div></div>
              <button onClick={() => setWithdrawOpen(false)} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700">Close</button>
            </div>
            <div className="mt-5 flex gap-2">
              {(["MOMO","CARD"] as const).map(m => <button key={m} onClick={()=>setWithdrawTab(m)} className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${withdrawTab===m?"border-emerald-500/50 bg-emerald-500/10 text-emerald-200":"border-slate-700 bg-slate-950/20 text-slate-400"}`}>{m==="MOMO"?"Mobile Money":"Visa / Card"}</button>)}
            </div>
            <div className="mt-4 space-y-3">
              {withdrawTab==="MOMO" ? (
                <>
                  <div><div className="text-xs font-semibold text-slate-300 mb-1">Network</div><div className="flex gap-2">{["MTN","TELECEL","AIRTELTIGO"].map(n=><button key={n} onClick={()=>setWithdrawNetwork(n)} className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold ${withdrawNetwork===n?"border-emerald-500/40 bg-emerald-500/10 text-emerald-200":"border-slate-700 bg-slate-950/20 text-slate-300"}`}>{n}</button>)}</div></div>
                  <div><div className="text-xs font-semibold text-slate-300 mb-1">Phone Number</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={withdrawPhone} onChange={e=>setWithdrawPhone(e.target.value)} placeholder="+233 24 000 0000" /></div>
                  <div><div className="text-xs font-semibold text-slate-300 mb-1">Amount (GH₵)</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} placeholder="e.g. 100" type="number" min="1" /></div>
                </>
              ) : (
                <>
                  <div><div className="text-xs font-semibold text-slate-300">Card Number</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 tracking-wider" value={withdrawCardNumber} onChange={e=>setWithdrawCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" maxLength={19} /></div>
                  <div><div className="text-xs font-semibold text-slate-300">Cardholder Name</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={withdrawCardName} onChange={e=>setWithdrawCardName(e.target.value)} placeholder="Name on card" /></div>
                  <div><div className="text-xs font-semibold text-slate-300">Expiry (MM/YY)</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={withdrawCardExpiry} onChange={e=>setWithdrawCardExpiry(e.target.value)} placeholder="08/27" maxLength={5} /></div>
                  <div><div className="text-xs font-semibold text-slate-300 mb-1">Amount (GH₵)</div><input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} placeholder="e.g. 100" type="number" min="1" /></div>
                </>
              )}
              {withdrawError && <div className="rounded-lg border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">{withdrawError}</div>}
              {withdrawOk && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{withdrawOk}</div>}
              <button disabled={withdrawBusy} className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60" onClick={async()=>{
                  setWithdrawError(null); setWithdrawOk(null);
                  if(!withdrawAmount || Number(withdrawAmount)<=0) { setWithdrawError("Enter a valid amount."); return; }
                  setWithdrawBusy(true);
                  try {
                    const res = withdrawTab==="MOMO"
                      ? await fetch("/api/withdraw/momo", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ walletId: ghsWallet.id, amount: withdrawAmount, phone: withdrawPhone, network: withdrawNetwork }) })
                      : await fetch("/api/withdraw/card", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ walletId: ghsWallet.id, amount: withdrawAmount, cardNumber:withdrawCardNumber, cardName:withdrawCardName, expiry:withdrawCardExpiry }) });
                    const data = await res.json();
                    if(!res.ok) { setWithdrawError(data?.error||"Withdraw failed."); return; }
                    setWithdrawOk(data.message || "Withdrawal submitted.");
                    setWithdrawAmount(""); setWithdrawPhone(""); setWithdrawCardNumber(""); setWithdrawCardName(""); setWithdrawCardExpiry("");
                    await loadWallets();
                  } catch(e) { setWithdrawError(e instanceof Error ? e.message : "Something went wrong."); } finally { setWithdrawBusy(false); }
              }}>Withdraw</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}