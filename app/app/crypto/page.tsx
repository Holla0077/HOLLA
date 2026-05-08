"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type UiWallet = {
  id: string;
  assetId: string;
  code: string;
  name: string;
  type: "FIAT" | "CRYPTO";
  balance: string;
};

type TabType = "Overview" | "Buy / Sell" | "Send / Receive";

const portfolioChart = [
  { value: 18 },
  { value: 24 },
  { value: 20 },
  { value: 32 },
  { value: 36 },
  { value: 41 },
  { value: 48 },
  { value: 63 },
];

const marketChart = [
  { time: "12AM", price: 62000 },
  { time: "3AM", price: 63200 },
  { time: "6AM", price: 64000 },
  { time: "9AM", price: 65100 },
  { time: "12PM", price: 64400 },
  { time: "3PM", price: 65800 },
  { time: "6PM", price: 66400 },
  { time: "9PM", price: 67800 },
];

const ASSET_META: Record<
  string,
  {
    icon: string;
    color: string;
    price: string;
    marketCap: string;
    volume: string;
    supply: string;
    network: string;
    change: number;
  }
> = {
  BTC: {
    icon: "₿",
    color: "bg-orange-500/20 text-orange-400",
    price: "$67,432.21",
    marketCap: "$1.33T",
    volume: "$34.21B",
    supply: "19.73M BTC",
    network: "Bitcoin Network",
    change: 2.31,
  },

  ETH: {
    icon: "Ξ",
    color: "bg-indigo-500/20 text-indigo-400",
    price: "$3,240.18",
    marketCap: "$412B",
    volume: "$16.8B",
    supply: "120.1M ETH",
    network: "Ethereum",
    change: -1.25,
  },

  LTC: {
    icon: "Ł",
    color: "bg-slate-400/20 text-slate-300",
    price: "$84.20",
    marketCap: "$6.2B",
    volume: "$890M",
    supply: "73.9M LTC",
    network: "Litecoin",
    change: 0.85,
  },

  USDT_ERC20: {
    icon: "₮",
    color: "bg-emerald-500/20 text-emerald-400",
    price: "$1.00",
    marketCap: "$110B",
    volume: "$88.2B",
    supply: "110B USDT",
    network: "Ethereum ERC20",
    change: 0.01,
  },
};

const transactions = [
  {
    type: "Buy",
    asset: "Bitcoin",
    code: "BTC",
    amount: "0.0025 BTC",
    value: "50.25",
    status: "Completed",
    date: "30 May 2024",
  },
  {
    type: "Receive",
    asset: "USDT",
    code: "USDT",
    amount: "50.00 USDT",
    value: "62.75",
    status: "Completed",
    date: "29 May 2024",
  },
  {
    type: "Sell",
    asset: "Ethereum",
    code: "ETH",
    amount: "0.010 ETH",
    value: "28.62",
    status: "Completed",
    date: "28 May 2024",
  },
];

export default function CryptoPage() {
  const [wallets, setWallets] = useState<UiWallet[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [activeTab, setActiveTab] =
    useState<TabType>("Overview");

  const [tradeMode, setTradeMode] =
    useState<"buy" | "sell">("buy");

  const [sendMode, setSendMode] =
    useState<"send" | "receive">("send");

  const selected = useMemo(
    () => wallets.find((w) => w.id === selectedId) ?? null,
    [wallets, selectedId]
  );

  const selectedMeta = ASSET_META[selected?.code || "BTC"];

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/wallets");
        const data = await res.json();

        const list = Array.isArray(data.wallets)
          ? data.wallets
          : [];

        const cryptoWallets = list.filter(
          (w: UiWallet) =>
            w.type === "CRYPTO" && w.code !== "GHS"
        );

        setWallets(cryptoWallets);

        if (cryptoWallets.length > 0) {
          setSelectedId(cryptoWallets[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#070B1A] text-white pb-10">
      <div className="max-w-[1500px] mx-auto px-5 lg:px-8 py-8">
        {/* PAGE TITLE */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight"> 
            Crypto
          </h1>

          {/* TABS */}
          <div className="flex items-center gap-8 mt-7 border-b border-slate-800">
            {(["Overview", "Buy / Sell", "Send / Receive"] as TabType[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-medium relative transition-all ${
                    activeTab === tab
                      ? "text-emerald-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab}

                  {activeTab === tab && (
                    <div className="absolute left-0 bottom-0 h-[2px] w-full bg-emerald-400 rounded-full" />
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* TOP GRID */}
        <div className="grid grid-cols-[58%_42%] gap-4 sm:gap-6 items-start">
          {/* LEFT SIDE */}
          <div className="space-y-6">
            {/* PORTFOLIO PANEL */}
            <div className="h-48 sm:h-56 md:h-64 lg:h-[260px] rounded-3xl border border-slate-800 bg-[#0B1220]/90 overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_40%)]" />

              <div className="relative p-6 h-full flex flex-col">
                <div className="text-sm text-slate-400 mb-2">
                  Portfolio Value
                </div>

                <div className="text-5xl font-bold">
                  GHS 6,940.45
                </div>

                <div className="text-slate-400 mt-2 text-sm">
                  ≈ $445.60 USD
                </div>

                <div className="mt-5">
                  <div className="text-sm text-slate-400">
                    24h Change
                  </div>

                  <div className="text-2xl font-semibold text-emerald-400">
                    +2.36%
                  </div>
                </div>

                <div className="flex-1 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={portfolioChart}>
                      <defs>
                        <linearGradient
                          id="portfolioGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#10b981"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="100%"
                            stopColor="#10b981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#00ff9d"
                        strokeWidth={3}
                        fill="url(#portfolioGradient)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ASSETS PANEL */}
            <div className="h-56 sm:h-64 md:h-80 lg:h-[360px] rounded-3xl border border-slate-800 bg-[#0B1220]/85 p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <div className="text-lg font-semibold">
                  Your Assets
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto h-[285px] pr-1">
                {loading && (
                  <div className="text-sm text-slate-400">
                    Loading wallets...
                  </div>
                )}

                {wallets.map((wallet) => {
                  const meta = ASSET_META[wallet.code];

                  return (
                    <button
                      key={wallet.id}
                      onClick={() => setSelectedId(wallet.id)}
                      className={`w-full rounded-2xl border p-4 transition-all ${
                        selectedId === wallet.id
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-800 bg-slate-900/20 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-full flex items-center justify-center text-lg ${meta?.color}`}
                          >
                            {meta?.icon}
                          </div>

                          <div className="text-left">
                            <div className="font-medium">
                              {wallet.name}
                            </div>

                            <div className="text-xs text-slate-400">
                              {wallet.code}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-medium">
                            {wallet.balance}
                          </div>

                          <div
                            className={`text-sm font-semibold ${
                              meta?.change >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {meta?.change > 0 ? "+" : ""}
                            {meta?.change}%
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="h-auto lg:h-[640px] rounded-3xl border border-slate-800 bg-[#0B1220]/85 overflow-hidden">
            {/* OVERVIEW */}
            {activeTab === "Overview" && selected && (
              <div className="h-full flex flex-col">
                <div className="p-7 border-b border-slate-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${selectedMeta.color}`}
                        >
                          {selectedMeta.icon}
                        </div>

                        <div>
                          <div className="text-2xl font-bold">
                            {selected.name} ({selected.code})
                          </div>

                          <div className="flex items-center gap-3 mt-3">
                            <div className="text-5xl font-bold">
                              {selectedMeta.price}
                            </div>

                            <div
                              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                selectedMeta.change >= 0
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {selectedMeta.change > 0 ? "+" : ""}
                              {selectedMeta.change}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FILTERS */}
                  <div className="flex items-center gap-5 mt-7">
                    {["1H", "24H", "7D", "30D", "90D", "1Y"].map(
                      (time) => (
                        <button
                          key={time}
                          className={`text-sm ${
                            time === "24H"
                              ? "text-emerald-400 font-semibold"
                              : "text-slate-400"
                          }`}
                        >
                          {time}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* CHART */}
                <div className="h-[280px] px-3 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={marketChart}>
                      <defs>
                        <linearGradient
                          id="marketGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#10b981"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="#10b981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        vertical={false}
                        stroke="rgba(148,163,184,0.08)"
                      />

                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip />

                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#00ff9d"
                        strokeWidth={3}
                        fill="url(#marketGradient)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* MARKET STATS */}
                <div className="grid grid-cols-2 border-t border-slate-800">
                  {[
                    ["Market Cap", selectedMeta.marketCap],
                    ["24h Volume", selectedMeta.volume],
                    ["Circulating Supply", selectedMeta.supply],
                    ["Network", selectedMeta.network],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="border-r border-b border-slate-800 p-5"
                    >
                      <div className="text-sm text-slate-400">
                        {label}
                      </div>

                      <div className="text-2xl font-semibold mt-2">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BUY / SELL */}
            {activeTab === "Buy / Sell" && selected && (
              <div className="p-6 h-full">
                {/* TOGGLE */}
                <div className="grid grid-cols-2 rounded-2xl bg-slate-900/40 p-1 mb-7">
                  <button
                    onClick={() => setTradeMode("buy")}
                    className={`rounded-xl py-3 text-sm font-semibold transition-all ${
                      tradeMode === "buy"
                        ? "bg-emerald-500 text-black"
                        : "text-slate-400"
                    }`}
                  >
                    Buy
                  </button>

                  <button
                    onClick={() => setTradeMode("sell")}
                    className={`rounded-xl py-3 text-sm font-semibold transition-all ${
                      tradeMode === "sell"
                        ? "bg-emerald-500 text-black"
                        : "text-slate-400"
                    }`}
                  >
                    Sell
                  </button>
                </div>

                <div className="space-y-6">
                  {/* PAY */}
                  <div>
                    <div className="text-sm text-slate-400 mb-3">
                      {tradeMode === "buy"
                        ? "You Pay"
                        : `You Sell (${selected.code})`}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                      <div className="text-sm text-slate-400 mb-3">
                        {tradeMode === "buy"
                          ? "GHS"
                          : selected.code}
                      </div>

                      <input
                        defaultValue={
                          tradeMode === "buy" ? "1000" : "0.0025"
                        }
                        className="bg-transparent outline-none text-4xl font-bold w-full"
                      />
                    </div>

                    {/* QUICK CHIPS */}
                    {tradeMode === "buy" && (
                      <div className="flex items-center gap-3 mt-4">
                        {["100", "500", "1000", "MAX"].map(
                          (chip) => (
                            <button
                              key={chip}
                              className="rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-2 text-sm hover:border-emerald-500 transition-colors"
                            >
                              {chip}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* RECEIVE */}
                  <div>
                    <div className="text-sm text-slate-400 mb-3">
                      {tradeMode === "buy"
                        ? `You Get (${selected.code})`
                        : "You Receive (GHS)"}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                      <input
                        defaultValue={
                          tradeMode === "buy"
                            ? "0.00013334"
                            : "2,431.20"
                        }
                        className="bg-transparent outline-none text-4xl font-bold w-full"
                      />
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        Available Balance
                      </span>

                      <span>{selected.balance}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        Estimated Fees
                      </span>

                      <span>GHS 12.50</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        Network
                      </span>

                      <span>{selectedMeta.network}</span>
                    </div>
                  </div>

                  <button className="w-full rounded-2xl bg-emerald-500 py-4 text-lg font-semibold text-black hover:bg-emerald-400 transition-colors">
                    {tradeMode === "buy" ? "Buy" : "Sell"}{" "}
                    {selected.name}
                  </button>
                </div>
              </div>
            )}

            {/* SEND / RECEIVE */}
            {activeTab === "Send / Receive" && selected && (
              <div className="p-6 h-full">
                {/* TOGGLE */}
                <div className="grid grid-cols-2 rounded-2xl bg-slate-900/40 p-1 mb-7">
                  <button
                    onClick={() => setSendMode("send")}
                    className={`rounded-xl py-3 text-sm font-semibold transition-all ${
                      sendMode === "send"
                        ? "bg-emerald-500 text-black"
                        : "text-slate-400"
                    }`}
                  >
                    Send
                  </button>

                  <button
                    onClick={() => setSendMode("receive")}
                    className={`rounded-xl py-3 text-sm font-semibold transition-all ${
                      sendMode === "receive"
                        ? "bg-emerald-500 text-black"
                        : "text-slate-400"
                    }`}
                  >
                    Receive
                  </button>
                </div>

                {sendMode === "send" ? (
                  <div className="space-y-6">
                    <div>
                      <div className="text-sm text-slate-400 mb-3">
                        Recipient {selected.code} Address
                      </div>

                      <textarea
                        rows={4}
                        placeholder={`Enter ${selected.code} wallet address`}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 p-4 resize-none outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <div className="text-sm text-slate-400 mb-3">
                        Amount ({selected.code})
                      </div>

                      <input
                        placeholder="0.00"
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 p-5 outline-none text-3xl font-bold focus:border-emerald-500"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          Available Balance
                        </span>

                        <span>{selected.balance}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          Network Fee
                        </span>

                        <span>0.00012 {selected.code}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          Network
                        </span>

                        <span>{selectedMeta.network}</span>
                      </div>
                    </div>

                    <button className="w-full rounded-2xl bg-emerald-500 py-4 text-lg font-semibold text-black hover:bg-emerald-400 transition-colors">
                      Send {selected.code}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-60 h-60 rounded-3xl bg-white flex items-center justify-center text-black text-xl font-bold">
                      QR CODE
                    </div>

                    <div className="mt-7 text-sm text-slate-400">
                      Your {selected.code} Address
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 break-all text-center text-sm max-w-md">
                      3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5
                    </div>

                    <div className="mt-4 text-sm text-slate-500">
                      {selectedMeta.network}
                    </div>

                    <button className="mt-6 rounded-xl border border-slate-700 px-5 py-3 text-sm hover:border-emerald-500 transition-colors">
                      Copy Address
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TRANSACTIONS */}
        <div className="mt-6 min-h-[280px] rounded-3xl border border-slate-800 bg-[#0B1220]/85 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 p-6">
            <div className="text-xl font-semibold">
              Recent Crypto Transactions
            </div>

            <button className="text-emerald-400 text-sm font-medium hover:text-emerald-300">
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-800">
                  {[
                    "Type",
                    "Asset",
                    "Amount",
                    "Value (GHS)",
                    "Status",
                    "Date",
                  ].map((header) => (
                    <th
                      key={header}
                      className="text-left px-6 py-4 text-sm text-slate-400 font-medium"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {transactions.map((tx, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-800/50 hover:bg-slate-900/20"
                  >
                    <td className="px-6 py-5">
                      <span
                        className={`font-semibold ${
                          tx.type === "Buy"
                            ? "text-emerald-400"
                            : tx.type === "Sell"
                            ? "text-red-400"
                            : "text-cyan-400"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="font-medium">
                        {tx.asset}
                      </div>

                      <div className="text-xs text-slate-400">
                        {tx.code}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      {tx.amount}
                    </td>

                    <td className="px-6 py-5">
                      {tx.value}
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                        {tx.status}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-slate-300">
                      {tx.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}