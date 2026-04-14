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
      // Convert BTC to satoshis
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
      router.refresh(); // Refresh wallet data
    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Transaction failed";
  setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Recipient Address</label>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="bc1q..."
          className="w-full p-2 border rounded dark:bg-gray-800"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Amount (BTC)</label>
        <input
          type="number"
          step="0.00000001"
          min="0.00000001"
          value={amountBtc}
          onChange={(e) => setAmountBtc(e.target.value)}
          placeholder="0.001"
          className="w-full p-2 border rounded dark:bg-gray-800"
          required
        />
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {success && <div className="text-green-500 text-sm break-all">{success}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send BTC"}
      </button>
    </form>
  );
}