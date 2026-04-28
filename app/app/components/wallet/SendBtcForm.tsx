"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SendBtcForm() {
  const router = useRouter();
  const [toAddress, setToAddress] = useState("");
  const [amountBtc, setAmountBtc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const amountSatoshis = Math.floor(parseFloat(amountBtc) * 100_000_000);
      if (isNaN(amountSatoshis) || amountSatoshis <= 0) {
        throw new Error("Invalid amount");
      }

      const res = await fetch("/api/wallets/btc/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toAddress, amountSatoshis }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Transaction failed");
      }

      setSuccess(`Transaction sent! TXID: ${data.txid}`);
      setToAddress("");
      setAmountBtc("");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Destination Address */}
      <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
        <div className="text-[13px] font-semibold text-white/90">Destination address</div>
        <div className="mt-1 text-[12px] text-white/60">Paste the recipient&apos;s BTC wallet address</div>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="bc1q..."
          className="mt-3 w-full rounded-[12px] border border-slate-200/20 bg-slate-900/10 px-3 py-2 font-mono text-[13px] text-white outline-none focus:border-emerald-400"
          required
        />
      </div>

      {/* Amount */}
      <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
        <div className="text-[13px] font-semibold text-white/90">Amount (BTC)</div>
        <div className="mt-1 text-[12px] text-white/60">Enter the amount to send</div>
        <input
          type="number"
          step="0.00000001"
          min="0.00000001"
          value={amountBtc}
          onChange={(e) => setAmountBtc(e.target.value)}
          placeholder="0.001"
          className="mt-3 w-full rounded-[12px] border border-slate-200/20 bg-slate-900/10 px-3 py-2 text-[14px] text-white outline-none focus:border-emerald-400"
          required
        />
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="rounded-[14px] border border-red-700/40 bg-red-500/10 p-3 text-[13px] text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 p-3 text-[13px] text-emerald-200 break-all">
          {success}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-[16px] bg-emerald-500 px-6 py-3 text-[16px] font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
      >
        {loading ? "Sending…" : "SEND BTC"}
      </button>
    </form>
  );
}