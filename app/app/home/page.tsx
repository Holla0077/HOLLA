"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type InputHTMLAttributes, type ReactNode, useEffect, useMemo, useState } from "react";
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

const USD_GHS_RATE = 12.5;
const spendingChartData = [
  { date: '1 May',  amount: 1200 },
  { date: '8 May',  amount: 2100 },
  { date: '15 May', amount: 2900 },
  { date: '22 May', amount: 3700 },
  { date: '30 May', amount: 4400 },
];

const NETWORK_OPTIONS = ["MTN", "TELECEL", "AIRTELTIGO"] as const;

function amountPreview(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "GHS 0.00";
  return `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isPositiveAmount(amount: string) {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0;
}

function ModalShell({
  icon,
  title,
  subtitle,
  maxWidth = "max-w-xl",
  onClose,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  maxWidth?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default bg-[#020617]/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full ${maxWidth} max-h-[88vh] overflow-y-auto rounded-[28px] border border-emerald-500/15 bg-[#07111f]/95 shadow-[0_24px_90px_rgba(0,0,0,0.58)]`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
        <div className="p-5 sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-sm font-black text-emerald-200 shadow-[0_0_26px_rgba(16,185,129,0.12)]">
                {icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-400">{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700/80 bg-slate-950/50 px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              x
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-xs text-slate-500">{hint}</span>}
    </div>
  );
}

function ModalInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-slate-700/80 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 ${className}`}
    />
  );
}

function SegmentButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/30 ${
        active
          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
          : "border-slate-700/80 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function NetworkSelector({ value, onChange }: { value: string; onChange: (network: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {NETWORK_OPTIONS.map((network) => (
        <button
          key={network}
          type="button"
          onClick={() => onChange(network)}
          className={`rounded-2xl border px-2 py-3 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/30 ${
            value === network
              ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
              : "border-slate-700/80 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-200"
          }`}
        >
          {network}
        </button>
      ))}
    </div>
  );
}

function SummaryBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Summary</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}

function StatusNotice({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-red-500/35 bg-red-500/10 text-red-200",
    success: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
    info: "border-blue-500/35 bg-blue-500/10 text-blue-200",
  };
  return <div className={`rounded-2xl border p-3 text-sm ${styles[kind]}`}>{children}</div>;
}

function PrimaryModalButton({
  children,
  loading,
  loadingLabel,
  disabled,
  onClick,
}: {
  children: ReactNode;
  loading?: boolean;
  loadingLabel: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="w-full rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-300/50"
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

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
  const [sendNote, setSendNote] = useState("");
  const [sendConfirming, setSendConfirming] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);
  const [receiveCopyOk, setReceiveCopyOk] = useState<string | null>(null);
  const [qrMerchant, setQrMerchant] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrOk, setQrOk] = useState<string | null>(null);

  const [meUser, setMeUser] = useState<{ username?: string; email?: string; phone?: string; fullName?: string; isVerified?: boolean } | null>(null);
  const [kashPoints, setKashPoints] = useState(0);

  useEffect(() => {
    fetch("/api/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) { setVerifyStatus(d.user.verificationStatus ?? "NONE"); setMeUser(d.user); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/referrals")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setKashPoints(Number(d.pointsBalance || 0)); })
      .catch(() => {});
  }, []);

  async function loadWallets(showSpinner = false) {
    try {
      if (showSpinner) setWalletsLoading(true);
      const res = await fetch("/api/wallets");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load wallets");
      setWallets(Array.isArray(data.wallets) ? data.wallets : []);
    } catch (e: unknown) { console.error(e); } finally { setWalletsLoading(false); }
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

  async function handleTopup() {
    setTopupError(null);
    setTopupOk(null);
    setTopupPending(null);
    if (!isPositiveAmount(topupAmount)) {
      setTopupError("Enter a valid amount.");
      return;
    }
    if (!ghsWallet) {
      setTopupError("No GHS wallet found.");
      return;
    }
    if (fundMethod === "MOMO" && !topupPhone.trim()) {
      setTopupError("Enter the mobile money phone number.");
      return;
    }
    if (fundMethod === "CARD" && (!topupCardNumber.trim() || !topupCardName.trim() || !topupCardExpiry.trim() || !topupCardCvv.trim())) {
      setTopupError("Enter all card payment details.");
      return;
    }

    setTopupBusy(true);
    try {
      const res = fundMethod === "MOMO"
        ? await fetch("/api/topup/momo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletId: ghsWallet.id, amount: topupAmount, phone: topupPhone, network: topupNetwork }),
        })
        : await fetch("/api/topup/card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletId: ghsWallet.id, amount: topupAmount, cardNumber: topupCardNumber, cardName: topupCardName, expiry: topupCardExpiry, cvv: topupCardCvv }),
        });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Top up failed.");

      if (data?.status === "PENDING") {
        setTopupPending(data.message || "Payment request sent. Approve it on your phone to complete funding.");
      } else {
        setTopupOk(data?.message || "Wallet funded successfully.");
      }
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
  }

  async function handleWithdraw() {
    setWithdrawError(null);
    setWithdrawOk(null);
    setWithdrawPending(null);
    if (!isPositiveAmount(withdrawAmount)) {
      setWithdrawError("Enter a valid amount.");
      return;
    }
    if (!ghsWallet) {
      setWithdrawError("No GHS wallet found.");
      return;
    }
    if (withdrawTab === "MOMO" && !withdrawPhone.trim()) {
      setWithdrawError("Enter the withdrawal phone number.");
      return;
    }
    if (withdrawTab === "CARD" && (!withdrawCardNumber.trim() || !withdrawCardName.trim() || !withdrawCardExpiry.trim())) {
      setWithdrawError("Enter all card withdrawal details.");
      return;
    }

    setWithdrawBusy(true);
    try {
      const res = withdrawTab === "MOMO"
        ? await fetch("/api/withdraw/momo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletId: ghsWallet.id, amount: withdrawAmount, phone: withdrawPhone, network: withdrawNetwork }),
        })
        : await fetch("/api/withdraw/card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletId: ghsWallet.id, amount: withdrawAmount, cardNumber: withdrawCardNumber, cardName: withdrawCardName, expiry: withdrawCardExpiry }),
        });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Withdraw failed.");

      if (data?.status === "PENDING") {
        setWithdrawPending(data.message || "Withdrawal submitted and awaiting processing.");
      } else {
        setWithdrawOk(data?.message || "Withdrawal submitted.");
      }
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
  }

  async function handleSendMoney() {
    setSendError(null); setSendOk(null);
    if (!sendRecipient.trim() || !isPositiveAmount(sendAmount)) {
      setSendError("Enter recipient and a valid amount."); return;
    }
    if (!ghsWallet) { setSendError("No GHS wallet found"); return; }
    if (!sendConfirming) {
      setSendConfirming(true);
      return;
    }
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
      setSendRecipient(""); setSendAmount(""); setSendNote(""); setSendConfirming(false);
      await loadWallets();
    } catch (e) { setSendError(e instanceof Error ? e.message : "Transfer failed"); } finally { setSendBusy(false); }
  }

  async function copyReceiveDetail(label: string, value: string) {
    setReceiveCopyOk(null);
    if (!value || value === "-") return;
    try {
      await navigator.clipboard.writeText(value);
      setReceiveCopyOk(`${label} copied.`);
    } catch {
      setReceiveCopyOk("Copy failed. Please copy the detail manually.");
    }
  }

  function handleQrPayPlaceholder() {
    setQrError(null);
    setQrOk(null);
    if (!qrMerchant.trim()) {
      setQrError("Enter a merchant ID or scanned code to continue.");
      return;
    }
    setQrBusy(true);
    // TODO: Connect this action to the QR Pay backend when the API is available.
    window.setTimeout(() => {
      setQrBusy(false);
      setQrError("QR Pay processing is not connected yet. No payment was submitted.");
    }, 250);
  }

  return (
    <div className="min-h-screen bg-[#070B1A] text-white pb-20 overflow-x-hidden">
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
          {/* GHS Balance Card */}
          <div className="col-span-12 lg:col-span-5 relative overflow-hidden rounded-[22px] border border-slate-200/20 bg-slate-950/40 backdrop-blur-sm sm:py-12 sm:px-8 py-8 px-5 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
            <div className="pointer-events-none absolute right-4 top-2 text-[100px] sm:text-[140px] font-black text-white/5 leading-none select-none">₵</div>
            <div className="relative flex flex-col items-start text-left">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Balance</div>
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  {ghsWallet ? formatFiatFromMinorUnits(ghsWallet.balance, "GH₵") : "GH₵ 0.00"}
                </div>
                <div className="text-sm text-slate-400">
                  ≈ ${(Number(ghsWallet?.balance || "0") / 100 / USD_GHS_RATE).toFixed(2)} USD
                </div>
              </div>
              <div className="flex flex-col xxs:flex-row gap-3 w-full mt-7">
                <button onClick={() => setTopupOpen(true)} className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  Fund Wallet
                </button>
                <button onClick={() => { setWithdrawError(null); setWithdrawOpen(true); }} className="flex-1 rounded-xl border border-slate-600 bg-transparent px-4 py-3 text-sm font-semibold text-white hover:border-slate-500 transition-colors">
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          {/* Three mini-wallets */}
<div className="col-span-12 lg:col-span-7 flex flex-col sm:flex-row gap-4 self-start lg:h-40">
  {/* Crypto */}
  <button
    type="button"
    onClick={() => router.push("/app/crypto")}
    className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 flex flex-col items-start justify-between text-left hover:border-emerald-500/40 hover:bg-slate-900/50 transition-all"
  >
    <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-2xl">₿</div>
    <div>
      <div className="text-xs text-slate-400 uppercase tracking-wider">Crypto Wallet</div>
      {(() => {
        const cryptoWallets = wallets.filter(w => w.type === "CRYPTO" && w.code !== "GHS");
        const totalCryptoValue = cryptoWallets.reduce((sum, w) => sum + Number(w.balance || "0") / 100_000_000, 0);
        return (
          <>
            <div className="text-lg font-bold text-white mt-1">
              {totalCryptoValue.toLocaleString(undefined, { maximumFractionDigits: 8 })}
            </div>
            <div className="text-xs text-slate-400">
              {cryptoWallets.length} crypto assets
            </div>
          </>
        );
      })()}
    </div>
  </button>

  {/* Card */}
  <button
    type="button"
    onClick={() => router.push("/app/cards")}
    className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 flex flex-col items-start justify-between text-left hover:border-purple-500/40 hover:bg-slate-900/50 transition-all"
  >
    <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl">💳</div>
    <div>
      <div className="text-xs text-slate-400 uppercase tracking-wider">Card Wallet</div>
      <div className="text-lg font-bold text-white mt-1">Coming Soon</div>
      <div className="text-xs text-slate-400">Physical & virtual cards</div>
    </div>
  </button>

  {/* KASH Points */}
  <button
    type="button"
    onClick={() => router.push("/app/referrals")}
    className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 flex flex-col items-start justify-between text-left hover:border-emerald-500/40 hover:bg-slate-900/50 transition-all"
  >
    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">⭐</div>
    <div>
      <div className="text-xs text-slate-400 uppercase tracking-wider">KASH Points</div>
      <div className="text-lg font-bold text-white mt-1">{kashPoints.toLocaleString()} PTS</div>
      <div className="text-xs text-slate-400">Earn more by referring friends</div>
    </div>
  </button>
</div>

          {/* Quick Actions */}
          <div className="col-span-12 lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 self-start mt-0">
            <div className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Quick Actions</div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <button onClick={() => setSendMoneyOpen(true)} className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/30 p-3 sm:p-4 hover:border-emerald-500/30 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-[11px] sm:text-xs font-medium text-white">Send Money</span>
              </button>
              <button onClick={() => setReceiveMoneyOpen(true)} className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/30 p-3 sm:p-4 hover:border-emerald-500/30 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
                </svg>
                <span className="text-[11px] sm:text-xs font-medium text-white">Receive Money</span>
              </button>
              <button onClick={() => setPayMerchantOpen(true)} className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/30 p-3 sm:p-4 hover:border-emerald-500/30 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-[11px] sm:text-xs font-medium text-white">QR Pay</span>
              </button>
            </div>
          </div>

          {/* Refer & Earn */}
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

        {/* RECENT TRANSACTIONS & SPENDING OVERVIEW */}
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
                        <div className="text-xs text-slate-400">{t.asset} · {(new Date(t.createdAt)).toLocaleString()}</div>
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-5 h-auto lg:h-[28rem] flex flex-col">
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

            <div className="flex items-baseline gap-3 mb-1">
              <div className="text-2xl font-bold text-white">GHS 2,340.00</div>
              <div className="flex items-center text-sm text-emerald-400">
                <svg className="w-4 h-4 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                12% from last month
              </div>
            </div>

            <div className="flex-1 w-full min-w-0 pt-4 sm:ml-0 -ml-4">
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
                  <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.15)" strokeDasharray="0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 5000]} ticks={[1000, 3000, 5000]} tickFormatter={(v) => `${v / 1000}k`} />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#spendingGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* GET THE KASHBOY APP BANNER */}
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
      </div>

      {/* REBUILT DASHBOARD MODALS */}
      {sendMoneyOpen && (
        <ModalShell
          icon="SEND"
          title="Send Money"
          subtitle="Move money instantly from your GHS wallet to another Kashboy account."
          maxWidth="max-w-lg"
          onClose={() => { setSendMoneyOpen(false); setSendConfirming(false); }}
        >
          <div className="space-y-4">
            <ModalField label="Recipient">
              <ModalInput
                placeholder="Username, email, or phone"
                value={sendRecipient}
                onChange={(e) => { setSendRecipient(e.target.value); setSendConfirming(false); }}
              />
            </ModalField>
            <div className="grid gap-4 sm:grid-cols-2">
              <ModalField label="Amount">
                <ModalInput
                  placeholder="0.00"
                  type="number"
                  min="1"
                  value={sendAmount}
                  onChange={(e) => { setSendAmount(e.target.value); setSendConfirming(false); }}
                />
              </ModalField>
              <ModalField label="Reference">
                <ModalInput
                  placeholder="Optional note"
                  value={sendNote}
                  onChange={(e) => { setSendNote(e.target.value); setSendConfirming(false); }}
                />
              </ModalField>
            </div>
            <SummaryBox>
              <SummaryRow label="From" value="GHS Wallet" />
              <SummaryRow label="Recipient" value={sendRecipient.trim() || "-"} />
              <SummaryRow label="Amount" value={amountPreview(sendAmount)} />
              <SummaryRow label="Reference" value={sendNote.trim() || "None"} />
            </SummaryBox>
            {sendConfirming && <StatusNotice kind="info">Review the transfer details, then confirm to send.</StatusNotice>}
            {sendError && <StatusNotice kind="error">{sendError}</StatusNotice>}
            {sendOk && <StatusNotice kind="success">{sendOk}</StatusNotice>}
            <div className="flex gap-3">
              {sendConfirming && (
                <button
                  type="button"
                  onClick={() => setSendConfirming(false)}
                  className="rounded-2xl border border-slate-700/80 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500"
                >
                  Back
                </button>
              )}
              <PrimaryModalButton
                loading={sendBusy}
                loadingLabel="Sending..."
                disabled={!sendRecipient.trim() || !isPositiveAmount(sendAmount)}
                onClick={handleSendMoney}
              >
                {sendConfirming ? "Confirm and Send" : "Review Transfer"}
              </PrimaryModalButton>
            </div>
          </div>
        </ModalShell>
      )}

      {receiveMoneyOpen && (
        <ModalShell
          icon="RCV"
          title="Receive Money"
          subtitle="Share your Kashboy details so another user can send money to you."
          maxWidth="max-w-lg"
          onClose={() => setReceiveMoneyOpen(false)}
        >
          <div className="space-y-4">
            <div className="flex h-44 items-center justify-center rounded-3xl border border-slate-700/70 bg-slate-950/45">
              <div className="grid h-28 w-28 grid-cols-4 grid-rows-4 gap-1 rounded-2xl border border-emerald-400/30 bg-white p-3">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span
                    key={index}
                    className={`rounded-sm ${[0, 1, 4, 5, 10, 11, 14, 15].includes(index) ? "bg-slate-950" : "bg-emerald-500/70"}`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Username", value: meUser?.username || "-" },
                { label: "Email", value: meUser?.email || "-" },
                { label: "Phone", value: meUser?.phone || "-" },
                { label: "GHS Wallet", value: ghsWallet?.id || "-" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/35 px-4 py-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
                    <div className="mt-1 break-all text-sm font-semibold text-white">{item.value}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyReceiveDetail(item.label, item.value)}
                    disabled={item.value === "-"}
                    className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
            <StatusNotice kind="info">Ask the sender to use your username, email, phone, or wallet reference.</StatusNotice>
            {receiveCopyOk && <StatusNotice kind={receiveCopyOk.startsWith("Copy failed") ? "error" : "success"}>{receiveCopyOk}</StatusNotice>}
          </div>
        </ModalShell>
      )}

      {payMerchantOpen && (
        <ModalShell
          icon="QR"
          title="QR Pay"
          subtitle="Display your payment QR or enter a merchant reference when scanner support is ready."
          maxWidth="max-w-lg"
          onClose={() => setPayMerchantOpen(false)}
        >
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-700/70 bg-slate-950/40 p-4">
              <div className="flex h-52 items-center justify-center rounded-2xl bg-white">
                <div className="grid h-32 w-32 grid-cols-5 grid-rows-5 gap-1 rounded-xl bg-white p-2">
                  {Array.from({ length: 25 }).map((_, index) => (
                    <span
                      key={index}
                      className={`rounded-sm ${[0, 1, 5, 6, 12, 18, 19, 23, 24].includes(index) ? "bg-black" : "bg-emerald-500"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Kashboy QR</div>
            </div>
            <ModalField label="Merchant ID or scanned code">
              <ModalInput
                placeholder="Enter merchant ID"
                value={qrMerchant}
                onChange={(e) => { setQrMerchant(e.target.value); setQrError(null); setQrOk(null); }}
              />
            </ModalField>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Supported Methods</div>
              <div className="flex flex-wrap gap-2">
                {["Wallet balance", "Merchant QR", "Scan to pay"].map((method) => (
                  <span key={method} className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                    {method}
                  </span>
                ))}
              </div>
            </div>
            <StatusNotice kind="info">QR Pay status: scanner and merchant processing are pending backend connection.</StatusNotice>
            {qrError && <StatusNotice kind="error">{qrError}</StatusNotice>}
            {qrOk && <StatusNotice kind="success">{qrOk}</StatusNotice>}
            <PrimaryModalButton
              loading={qrBusy}
              loadingLabel="Checking..."
              onClick={handleQrPayPlaceholder}
            >
              Continue QR Pay
            </PrimaryModalButton>
          </div>
        </ModalShell>
      )}

      {topupOpen && (
        <ModalShell
          icon="FUND"
          title="Fund Wallet"
          subtitle="Add money to your GHS wallet with Mobile Money or card."
          maxWidth="max-w-2xl"
          onClose={() => setTopupOpen(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-3xl border border-slate-700/70 bg-slate-950/30 p-1.5">
              <SegmentButton active={fundMethod === "MOMO"} onClick={() => { setFundMethod("MOMO"); setTopupError(null); }}>Mobile Money</SegmentButton>
              <SegmentButton active={fundMethod === "CARD"} onClick={() => { setFundMethod("CARD"); setTopupError(null); }}>Visa / Card</SegmentButton>
            </div>
            {fundMethod === "MOMO" ? (
              <div className="space-y-4">
                <ModalField label="Network">
                  <NetworkSelector value={topupNetwork} onChange={setTopupNetwork} />
                </ModalField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ModalField label="Phone number">
                    <ModalInput placeholder="+233 24 000 0000" value={topupPhone} onChange={(e) => setTopupPhone(e.target.value)} />
                  </ModalField>
                  <ModalField label="Amount">
                    <ModalInput placeholder="0.00" type="number" min="1" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} />
                  </ModalField>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <ModalField label="Card number">
                  <ModalInput className="tracking-wider" placeholder="1234 5678 9012 3456" maxLength={19} value={topupCardNumber} onChange={(e) => setTopupCardNumber(e.target.value)} />
                </ModalField>
                <ModalField label="Cardholder name">
                  <ModalInput placeholder="Name on card" value={topupCardName} onChange={(e) => setTopupCardName(e.target.value)} />
                </ModalField>
                <div className="grid gap-4 sm:grid-cols-3">
                  <ModalField label="Expiry">
                    <ModalInput placeholder="MM/YY" maxLength={5} value={topupCardExpiry} onChange={(e) => setTopupCardExpiry(e.target.value)} />
                  </ModalField>
                  <ModalField label="CVV">
                    <ModalInput placeholder="123" maxLength={4} type="password" value={topupCardCvv} onChange={(e) => setTopupCardCvv(e.target.value)} />
                  </ModalField>
                  <ModalField label="Amount">
                    <ModalInput placeholder="0.00" type="number" min="1" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} />
                  </ModalField>
                </div>
              </div>
            )}
            <SummaryBox>
              <SummaryRow label="Destination" value="GHS Wallet" />
              <SummaryRow label="Method" value={fundMethod === "MOMO" ? `${topupNetwork} Mobile Money` : "Visa / Card"} />
              <SummaryRow label="Amount" value={amountPreview(topupAmount)} />
              <SummaryRow label="Current balance" value={ghsWallet ? formatFiatFromMinorUnits(ghsWallet.balance, "GHS") : "Unavailable"} />
            </SummaryBox>
            {topupError && <StatusNotice kind="error">{topupError}</StatusNotice>}
            {topupOk && <StatusNotice kind="success">{topupOk}</StatusNotice>}
            {topupPending && <StatusNotice kind="info">{topupPending}</StatusNotice>}
            <PrimaryModalButton
              loading={topupBusy}
              loadingLabel="Processing..."
              disabled={!isPositiveAmount(topupAmount) || !ghsWallet || (fundMethod === "MOMO" ? !topupPhone.trim() : !topupCardNumber.trim() || !topupCardName.trim() || !topupCardExpiry.trim() || !topupCardCvv.trim())}
              onClick={handleTopup}
            >
              Fund Wallet
            </PrimaryModalButton>
          </div>
        </ModalShell>
      )}

      {withdrawOpen && (
        <ModalShell
          icon="OUT"
          title="Withdraw"
          subtitle="Withdraw from your GHS wallet to Mobile Money or card."
          maxWidth="max-w-2xl"
          onClose={() => setWithdrawOpen(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-3xl border border-slate-700/70 bg-slate-950/30 p-1.5">
              <SegmentButton active={withdrawTab === "MOMO"} onClick={() => { setWithdrawTab("MOMO"); setWithdrawError(null); }}>Mobile Money</SegmentButton>
              <SegmentButton active={withdrawTab === "CARD"} onClick={() => { setWithdrawTab("CARD"); setWithdrawError(null); }}>Visa / Card</SegmentButton>
            </div>
            {withdrawTab === "MOMO" ? (
              <div className="space-y-4">
                <ModalField label="Network">
                  <NetworkSelector value={withdrawNetwork} onChange={setWithdrawNetwork} />
                </ModalField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ModalField label="Phone or account">
                    <ModalInput placeholder="+233 24 000 0000" value={withdrawPhone} onChange={(e) => setWithdrawPhone(e.target.value)} />
                  </ModalField>
                  <ModalField label="Amount">
                    <ModalInput placeholder="0.00" type="number" min="1" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                  </ModalField>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <ModalField label="Card number">
                  <ModalInput className="tracking-wider" placeholder="1234 5678 9012 3456" maxLength={19} value={withdrawCardNumber} onChange={(e) => setWithdrawCardNumber(e.target.value)} />
                </ModalField>
                <ModalField label="Cardholder name">
                  <ModalInput placeholder="Name on card" value={withdrawCardName} onChange={(e) => setWithdrawCardName(e.target.value)} />
                </ModalField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ModalField label="Expiry">
                    <ModalInput placeholder="MM/YY" maxLength={5} value={withdrawCardExpiry} onChange={(e) => setWithdrawCardExpiry(e.target.value)} />
                  </ModalField>
                  <ModalField label="Amount">
                    <ModalInput placeholder="0.00" type="number" min="1" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                  </ModalField>
                </div>
              </div>
            )}
            <SummaryBox>
              <SummaryRow label="Source" value="GHS Wallet" />
              <SummaryRow label="Destination" value={withdrawTab === "MOMO" ? `${withdrawNetwork} Mobile Money` : "Visa / Card"} />
              <SummaryRow label="Amount" value={amountPreview(withdrawAmount)} />
              <SummaryRow label="Fees" value="Calculated at processing" />
              <SummaryRow label="Available" value={ghsWallet ? formatFiatFromMinorUnits(ghsWallet.balance, "GHS") : "Unavailable"} />
            </SummaryBox>
            {withdrawError && <StatusNotice kind="error">{withdrawError}</StatusNotice>}
            {withdrawOk && <StatusNotice kind="success">{withdrawOk}</StatusNotice>}
            {withdrawPending && <StatusNotice kind="info">{withdrawPending}</StatusNotice>}
            <PrimaryModalButton
              loading={withdrawBusy}
              loadingLabel="Submitting..."
              disabled={!isPositiveAmount(withdrawAmount) || !ghsWallet || (withdrawTab === "MOMO" ? !withdrawPhone.trim() : !withdrawCardNumber.trim() || !withdrawCardName.trim() || !withdrawCardExpiry.trim())}
              onClick={handleWithdraw}
            >
              Withdraw
            </PrimaryModalButton>
          </div>
        </ModalShell>
      )}

      {/* LEGACY SEND MONEY MODAL */}
      {false && sendMoneyOpen && (
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

      {/* LEGACY RECEIVE MONEY MODAL */}
      {false && receiveMoneyOpen && (
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
                    <span className="flex items-center gap-3 text-sm font-medium text-white">
                      {val}
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(String(val))}
                        className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:border-emerald-500"
                      >
                        Copy
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LEGACY QR PAY MODAL */}
      {false && payMerchantOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPayMerchantOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-[#070B1A] p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="text-lg font-semibold text-white">QR Pay</div>
              <button onClick={() => setPayMerchantOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="mb-4 flex h-48 items-center justify-center rounded-2xl border border-slate-800 bg-white text-sm font-bold text-black">
              QR CODE
            </div>
            <input className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 mb-4" placeholder="Enter Merchant ID or scan QR" />
            <button className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-600">Pay</button>
            <p className="text-xs text-slate-500 mt-2 text-center">Scanner integration placeholder</p>
          </div>
        </div>
      )}

      {/* LEGACY TOPUP MODAL */}
      {false && topupOpen && (
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

      {/* LEGACY WITHDRAW MODAL */}
      {false && withdrawOpen && ghsWallet && (
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
                      ? await fetch("/api/withdraw/momo", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ walletId: ghsWallet?.id || "", amount: withdrawAmount, phone: withdrawPhone, network: withdrawNetwork }) })
                      : await fetch("/api/withdraw/card", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ walletId: ghsWallet?.id || "", amount: withdrawAmount, cardNumber:withdrawCardNumber, cardName:withdrawCardName, expiry:withdrawCardExpiry }) });
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
