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

function formatCryptoBalance(balance: string, code?: string) {
  const amount = Number(balance || "0") / 100_000_000;
  const symbol = code ? assetTicker(code) : "";
  return formatCryptoAmount(amount, symbol);
}

function formatCombinedCrypto(wallets: UiWallet[]) {
  const total = wallets.reduce((sum, wallet) => sum + Number(wallet.balance || "0") / 100_000_000, 0);
  return total.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

const USD_GHS_RATE = 12.5;

function parseUsdPrice(price: string) {
  const n = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatGhsAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return "GHS 0.00";
  return `GHS ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUsd(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return "$0.00 USD";
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

function assetTicker(code: string) {
  return code.split("_")[0].replace("-", "");
}

function cryptoDecimals(code: string) {
  const ticker = assetTicker(code);
  if (ticker === "BTC") return 8;
  if (ticker === "ETH") return 6;
  if (ticker === "USDT" || ticker === "USDC") return 2;
  return 6;
}

function formatCryptoAmount(amount: number, code: string) {
  if (!Number.isFinite(amount) || amount <= 0) return `0 ${code}`;
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: cryptoDecimals(code) })} ${code}`;
}

function formatRate(rate: number, code: string) {
  if (!Number.isFinite(rate) || rate <= 0) return `Rate unavailable for ${code}`;
  return `Exchange rate: 1 ${code} ~= ${formatUsd(rate)}`;
}

function usdToCrypto(usdAmount: number, assetPriceUsd: number) {
  if (!Number.isFinite(usdAmount) || usdAmount <= 0 || !Number.isFinite(assetPriceUsd) || assetPriceUsd <= 0) return 0;
  return usdAmount / assetPriceUsd;
}

function cryptoToUsd(cryptoAmount: number, assetPriceUsd: number) {
  if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0 || !Number.isFinite(assetPriceUsd) || assetPriceUsd <= 0) return 0;
  return cryptoAmount * assetPriceUsd;
}

function assetPriceUsd(code: string, price: string) {
  // TODO: Replace static asset metadata with a live crypto price feed.
  if (code.startsWith("USDT") || code.startsWith("USDC")) return 1;
  return parseUsdPrice(price);
}

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

const FALLBACK_META = {
  icon: "¤",
  color: "bg-emerald-500/20 text-emerald-400",
  price: "Live balance",
  marketCap: "Pending",
  volume: "Pending",
  supply: "Pending",
  network: "Kashboy Wallet",
  change: 0,
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
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeResult, setTradeResult] = useState<string | null>(null);
  const [tradeBusy, setTradeBusy] = useState(false);
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [receiveAddress, setReceiveAddress] = useState("");

  const selected = useMemo(
    () => wallets.find((w) => w.id === selectedId) ?? null,
    [wallets, selectedId]
  );

  const selectedMeta = ASSET_META[selected?.code || "BTC"] ?? FALLBACK_META;
  const totalCryptoBalance = useMemo(() => formatCombinedCrypto(wallets), [wallets]);
  const selectedBalance = selected ? formatCryptoBalance(selected.balance, selected.code) : "0";
  const selectedPriceUsd = useMemo(() => {
    if (!selected) return 0;
    return assetPriceUsd(selected.code, selectedMeta.price);
  }, [selected, selectedMeta.price]);
  const selectedCryptoAmount = selected ? Number(selected.balance || "0") / 100_000_000 : 0;
  const selectedUsdValue = cryptoToUsd(selectedCryptoAmount, selectedPriceUsd);
  const portfolioValueGhs = useMemo(() => {
    return wallets.reduce((sum, wallet) => {
      const meta = ASSET_META[wallet.code] ?? FALLBACK_META;
      const walletValueUsd = cryptoToUsd(Number(wallet.balance || "0") / 100_000_000, assetPriceUsd(wallet.code, meta.price));
      return sum + walletValueUsd * USD_GHS_RATE;
    }, 0);
  }, [wallets]);
  const portfolioChange = useMemo(() => {
    if (wallets.length === 0) return 0;
    return wallets.reduce((sum, wallet) => {
      const meta = ASSET_META[wallet.code] ?? FALLBACK_META;
      return sum + meta.change;
    }, 0) / wallets.length;
  }, [wallets]);
  const tradeAmountNumber = Number(tradeAmount);
  const tradeCryptoAmount = usdToCrypto(tradeAmountNumber, selectedPriceUsd);
  const sendAmountNumber = Number(sendAmount);
  const sendCryptoAmount = usdToCrypto(sendAmountNumber, selectedPriceUsd);

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

  useEffect(() => {
    if (!selected || sendMode !== "receive") return;
    if (selected.code !== "BTC") {
      setReceiveAddress("Receive address generation is pending for this asset.");
      return;
    }

    fetch("/api/crypto/btc/address")
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => setReceiveAddress(data.address || ""))
      .catch(() => setReceiveAddress("Unable to load BTC address right now."));
  }, [selected, sendMode]);

  async function handleTrade() {
    if (!selected) return;
    setTradeResult(null);
    if (!tradeAmount || !Number.isFinite(tradeAmountNumber) || tradeAmountNumber <= 0 || !Number.isFinite(tradeCryptoAmount) || tradeCryptoAmount <= 0) {
      setTradeResult("Enter a valid amount.");
      return;
    }

    setTradeBusy(true);
    try {
      const res = await fetch("/api/crypto/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: tradeMode.toUpperCase(),
          assetCode: selected.code,
          amount: String(tradeCryptoAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Crypto request failed");
      setTradeResult(data.message || "Request submitted.");
    } catch (error) {
      setTradeResult(error instanceof Error ? error.message : "Crypto request failed");
    } finally {
      setTradeBusy(false);
    }
  }

  async function handleCryptoSend() {
    if (!selected) return;
    setSendResult(null);

    if (selected.code !== "BTC") {
      setSendResult("External send is currently connected for BTC only. Other assets are pending backend support.");
      return;
    }
    if (!sendAddress.trim() || !sendAmount || !Number.isFinite(sendAmountNumber) || sendAmountNumber <= 0 || sendCryptoAmount <= 0) {
      setSendResult("Enter a recipient address and valid USD amount.");
      return;
    }

    setSendBusy(true);
    try {
      const res = await fetch("/api/wallets/btc/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAddress: sendAddress.trim(),
          amountSatoshis: Math.round(sendCryptoAmount * 100_000_000),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "BTC send failed");
      setSendResult(data.txid ? `Broadcast submitted: ${data.txid}` : "Send submitted.");
    } catch (error) {
      setSendResult(error instanceof Error ? error.message : "BTC send failed");
    } finally {
      setSendBusy(false);
    }
  }

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
        <div className="grid grid-cols-1 xl:grid-cols-[58%_42%] gap-6 items-start">
          {/* LEFT SIDE */}
          <div className="space-y-6">
            {/* PORTFOLIO PANEL */}
            <div className="h-[250px] rounded-3xl border border-slate-800 bg-[#0B1220]/90 overflow-hidden relative shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_42%)]" />
              <div className="absolute bottom-0 right-0 top-8 w-[68%] opacity-95">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioChart} margin={{ top: 20, right: 18, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#00ff9d"
                      strokeWidth={3}
                      fill="url(#portfolioGradient)"
                      dot={{ r: 4, fill: "#00ff9d", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="relative z-10 flex h-full max-w-[56%] flex-col justify-center p-7">
                <div className="text-base font-medium text-slate-400">
                  Portfolio Value
                </div>
                <div className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {formatGhsAmount(portfolioValueGhs)}
                </div>
                <div className="mt-2 text-base text-slate-400">
                  ~= ${(portfolioValueGhs / USD_GHS_RATE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-6 text-base text-slate-400">
                  24h Change
                </div>
                <div className={`mt-1 text-lg font-bold ${portfolioChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {portfolioChange >= 0 ? "+" : ""}
                  {portfolioChange.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* ASSETS PANEL */}
            <div className="flex h-[366px] flex-col rounded-3xl border border-slate-800 bg-[#0B1220]/85 p-4 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
              <div className="grid shrink-0 grid-cols-[1.25fr_1fr_0.8fr_0.7fr] gap-3 px-3 pb-3 text-sm font-medium text-slate-400">
                <div>Asset</div>
                <div>Holdings</div>
                <div>24h Change</div>
                <div className="text-right">Trend</div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-800/80">
                {loading && (
                  <div className="p-5 text-sm text-slate-400">
                    Loading wallets...
                  </div>
                )}

                {wallets.map((wallet) => {
                  const meta = ASSET_META[wallet.code] ?? FALLBACK_META;
                  const walletAmount = Number(wallet.balance || "0") / 100_000_000;
                  const walletValueUsd = cryptoToUsd(walletAmount, assetPriceUsd(wallet.code, meta.price));
                  const isPositive = meta.change >= 0;
                  const ticker = assetTicker(wallet.code);

                  return (
                    <button
                      key={wallet.id}
                      onClick={() => setSelectedId(wallet.id)}
                      className={`grid w-full grid-cols-[1.25fr_1fr_0.8fr_0.7fr] items-center gap-3 border-b border-slate-800/80 px-3 py-3 text-left transition-all last:border-b-0 ${
                        selectedId === wallet.id
                          ? "bg-emerald-500/10"
                          : "bg-slate-950/10 hover:bg-slate-900/35"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${meta.color}`}>
                          {meta.icon}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">
                            {wallet.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {ticker}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-bold text-white">
                          {formatCryptoAmount(walletAmount, ticker)}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          ≈ {formatUsd(walletValueUsd)}
                        </div>
                      </div>

                      <div className={`text-sm font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {isPositive ? "+" : ""}
                        {meta.change.toFixed(2)}%
                      </div>

                      <div className="h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={marketChart} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                            <Area
                              type="monotone"
                              dataKey="price"
                              stroke={isPositive ? "#00ff9d" : "#ef4444"}
                              strokeWidth={2}
                              fill="transparent"
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </button>
                  );
                })}

                {!loading && wallets.length === 0 && (
                  <div className="p-5 text-sm text-slate-400">
                    No crypto wallets found.
                  </div>
                )}
              </div>

              </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="h-[640px] rounded-3xl border border-slate-800 bg-[#0B1220]/85 overflow-hidden">
            {!selected && (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                    ₿
                  </div>
                  <div className="mt-5 text-xl font-bold text-white">
                    No crypto wallet selected
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Add or activate a crypto wallet to view markets, buy, sell, send, and receive assets here.
                  </p>
                </div>
              </div>
            )}

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
                              {selectedBalance}
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
                    ["Wallet Balance", selectedBalance],
                    ["USD Value", formatUsd(selectedUsdValue)],
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
              <div className="flex h-full flex-col p-5 sm:p-6">
                <div className="grid grid-cols-2 border-b border-slate-800 pb-0">
                  <button
                    type="button"
                    onClick={() => { setTradeMode("buy"); setTradeAmount(""); setTradeResult(null); }}
                    className={`relative rounded-t-2xl py-4 text-sm font-bold transition-all ${
                      tradeMode === "buy"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Buy
                    {tradeMode === "buy" && <span className="absolute inset-x-0 bottom-[-1px] h-[2px] rounded-full bg-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTradeMode("sell"); setTradeAmount(""); setTradeResult(null); }}
                    className={`relative rounded-t-2xl py-4 text-sm font-bold transition-all ${
                      tradeMode === "sell"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sell
                    {tradeMode === "sell" && <span className="absolute inset-x-0 bottom-[-1px] h-[2px] rounded-full bg-emerald-400" />}
                  </button>
                </div>

                <div className="mt-7 flex-1 space-y-5">
                  <div>
                    <div className="mb-3 text-sm font-medium text-slate-400">
                      {tradeMode === "buy" ? "Amount to buy" : "Amount to sell"}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-[inset_0_0_30px_rgba(15,23,42,0.35)]">
                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          className="flex items-center gap-3 rounded-xl px-1 py-1 text-left"
                        >
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${tradeMode === "buy" ? "bg-emerald-500/15 text-emerald-300" : selectedMeta.color}`}>
                            $
                          </span>
                          <span className="font-bold text-white">
                            USD
                          </span>
                          <span className="text-slate-500">⌄</span>
                        </button>

                        <div className="min-w-0 flex-1 text-right">
                          <input
                            value={tradeAmount}
                            onChange={(e) => setTradeAmount(e.target.value)}
                            placeholder="100.00"
                            inputMode="decimal"
                            className="w-full bg-transparent text-right text-3xl font-black text-white outline-none placeholder:text-slate-600"
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="h-px bg-slate-800" />
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-950/70 text-xs text-slate-400">
                      ⇅
                    </div>
                    <div className="h-px bg-slate-800" />
                  </div>

                  <div>
                    <div className="mb-3 text-sm font-medium text-slate-400">
                      {tradeMode === "buy" ? "You will receive" : "Crypto equivalent"}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-[inset_0_0_30px_rgba(15,23,42,0.35)]">
                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          className="flex items-center gap-3 rounded-xl px-1 py-1 text-left"
                        >
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${tradeMode === "buy" ? selectedMeta.color : "bg-emerald-500/15 text-emerald-300"}`}>
                            {selectedMeta.icon}
                          </span>
                          <span className="font-bold text-white">
                            {assetTicker(selected.code)}
                          </span>
                          <span className="text-slate-500">⌄</span>
                        </button>

                        <div className="text-right">
                          <div className="text-2xl font-black text-white sm:text-3xl">
                            {formatCryptoAmount(tradeCryptoAmount, assetTicker(selected.code)).replace(` ${assetTicker(selected.code)}`, "")}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            = {formatUsd(tradeAmountNumber)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-400">
                    {formatRate(selectedPriceUsd, assetTicker(selected.code))}
                  </div>

                  {tradeResult && (
                    <div className={`rounded-2xl border p-4 text-sm ${
                      tradeResult.toLowerCase().includes("failed") || tradeResult.toLowerCase().includes("valid")
                        ? "border-red-500/30 bg-red-500/10 text-red-200"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    }`}>
                      {tradeResult}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleTrade}
                    disabled={tradeBusy || !tradeAmount || tradeAmountNumber <= 0 || tradeCryptoAmount <= 0}
                    className="w-full rounded-2xl bg-emerald-500 py-4 text-base font-black text-black shadow-[0_0_24px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {tradeBusy ? "Submitting..." : tradeMode === "buy" ? "Buy" : "Sell"}{" "}
                    {selected.name}
                  </button>
                </div>
              </div>
            )}

            {/* SEND / RECEIVE */}
            {activeTab === "Send / Receive" && selected && (
              <div className="flex h-full flex-col p-5 sm:p-6">
                <div className="grid grid-cols-2 border-b border-slate-800 pb-0">
                  <button
                    type="button"
                    onClick={() => { setSendMode("send"); setSendResult(null); }}
                    className={`relative rounded-t-2xl py-4 text-sm font-bold transition-all ${
                      sendMode === "send"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Send
                    {sendMode === "send" && <span className="absolute inset-x-0 bottom-[-1px] h-[2px] rounded-full bg-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSendMode("receive"); setSendResult(null); }}
                    className={`relative rounded-t-2xl py-4 text-sm font-bold transition-all ${
                      sendMode === "receive"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Receive
                    {sendMode === "receive" && <span className="absolute inset-x-0 bottom-[-1px] h-[2px] rounded-full bg-emerald-400" />}
                  </button>
                </div>

                {sendMode === "send" ? (
                  <div className="mt-7 flex-1 space-y-5">
                    <div>
                      <div className="mb-3 text-sm font-medium text-slate-400">
                        Amount to send
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-[inset_0_0_30px_rgba(15,23,42,0.35)]">
                        <div className="flex items-center justify-between gap-4">
                          <button
                            type="button"
                            className="flex items-center gap-3 rounded-xl px-1 py-1 text-left"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-sm text-emerald-300">
                              $
                            </span>
                            <span className="font-bold text-white">
                              USD
                            </span>
                            <span className="text-slate-500">⌄</span>
                          </button>

                          <div className="min-w-0 flex-1 text-right">
                            <input
                              placeholder="50.00"
                              value={sendAmount}
                              onChange={(e) => setSendAmount(e.target.value)}
                              inputMode="decimal"
                              className="w-full bg-transparent text-right text-3xl font-black text-white outline-none placeholder:text-slate-600"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-slate-400">
                        Crypto amount: {formatCryptoAmount(sendCryptoAmount, assetTicker(selected.code))}
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="h-px bg-slate-800" />
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-950/70 text-xs text-slate-400">
                        TO
                      </div>
                      <div className="h-px bg-slate-800" />
                    </div>

                    <div>
                      <div className="mb-3 text-sm font-medium text-slate-400">
                        Recipient Address
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-[inset_0_0_30px_rgba(15,23,42,0.35)]">
                        <textarea
                          rows={4}
                          placeholder={`Enter ${assetTicker(selected.code)} wallet address`}
                          value={sendAddress}
                          onChange={(e) => setSendAddress(e.target.value)}
                          className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    {sendResult && (
                      <div className={`rounded-2xl border p-4 text-sm ${
                        sendResult.toLowerCase().includes("failed") || sendResult.toLowerCase().includes("enter")
                          ? "border-red-500/30 bg-red-500/10 text-red-200"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      }`}>
                        {sendResult}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCryptoSend}
                      disabled={sendBusy || !sendAddress.trim() || !sendAmount || sendAmountNumber <= 0 || sendCryptoAmount <= 0}
                      className="w-full rounded-2xl bg-emerald-500 py-4 text-base font-black text-black shadow-[0_0_24px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendBusy ? "Sending..." : `Send ${assetTicker(selected.code)}`}
                    </button>
                  </div>
                ) : (
                  <div className="mt-7 flex-1 space-y-5">
                    <div>
                      <div className="mb-3 text-sm font-medium text-slate-400">
                        Receive Asset
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-[inset_0_0_30px_rgba(15,23,42,0.35)]">
                        <div className="flex items-center justify-between gap-4">
                          <button
                            type="button"
                            className="flex items-center gap-3 rounded-xl px-1 py-1 text-left"
                          >
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${selectedMeta.color}`}>
                              {selectedMeta.icon}
                            </span>
                            <span className="font-bold text-white">
                              {assetTicker(selected.code)}
                            </span>
                            <span className="text-slate-500">⌄</span>
                          </button>

                          <div className="text-right">
                            <div className="text-2xl font-black text-white sm:text-3xl">
                              {assetTicker(selected.code)}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Balance: {selectedBalance}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="h-px bg-slate-800" />
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-950/70 text-xs text-slate-400">
                        QR
                      </div>
                      <div className="h-px bg-slate-800" />
                    </div>

                    <div>
                      <div className="mb-3 text-sm font-medium text-slate-400">
                        Your Receive QR
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-[inset_0_0_30px_rgba(15,23,42,0.35)]">
                        <div className="flex h-48 items-center justify-center rounded-2xl bg-white">
                          <div className="grid h-32 w-32 grid-cols-5 grid-rows-5 gap-1 rounded-xl bg-white p-2">
                            {Array.from({ length: 25 }).map((_, index) => (
                              <span
                                key={index}
                                className={`rounded-sm ${[0, 1, 5, 6, 12, 18, 19, 23, 24].includes(index) ? "bg-black" : "bg-emerald-500"}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 text-sm font-medium text-slate-400">
                        Your {assetTicker(selected.code)} Address
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-[inset_0_0_30px_rgba(15,23,42,0.35)]">
                        <div className="break-all text-sm leading-6 text-white">
                          {receiveAddress || "Select Receive to load an address."}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(receiveAddress)}
                      disabled={!receiveAddress}
                      className="w-full rounded-2xl bg-emerald-500 py-4 text-base font-black text-black shadow-[0_0_24px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
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
                    "Value (USD)",
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
