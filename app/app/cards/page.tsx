"use client";

import { useEffect, useMemo, useState } from "react";

type UiCard = {
  id: string;
  type: "NIGHT" | "GO_EAT" | "BTC_GIFT";
  status: "CREATED" | "ACTIVATED" | "REDEEMED" | "EXPIRED";
  currency: string;
  initialValue: string;
  remainingValue: string;
  isReloadable: boolean;
  expiresAt: string | null;
  createdAt: string;
};

function formatCardValue(value: string, currency: string) {
  const amount = Number(value || "0") / 100;
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function cardLabel(type: UiCard["type"]) {
  if (type === "GO_EAT") return "KASHBOY GO EAT";
  if (type === "BTC_GIFT") return "KASHBOY BTC GIFT";
  return "KASHBOY NIGHT";
}

export default function CardsPage() {
  const [activeTab, setActiveTab] = useState<"MY_CARDS" | "REDEEM">("MY_CARDS");
  const [cards, setCards] = useState<UiCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const activeCards = useMemo(
    () => cards.filter((card) => card.status !== "REDEEMED" && card.status !== "EXPIRED"),
    [cards]
  );

  async function loadCards() {
    try {
      setLoading(true);
      const res = await fetch("/api/cards");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load cards");
      setCards(Array.isArray(data.cards) ? data.cards : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards();
  }, []);

  async function handleRedeem() {
    setRedeemMessage(null);
    setRedeemError(null);
    if (!redeemCode.trim()) {
      setRedeemError("Enter a card code.");
      return;
    }

    setRedeemBusy(true);
    try {
      const res = await fetch("/api/cards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Card redemption failed");
      setRedeemMessage(data.message || "Card redeemed successfully.");
      setRedeemCode("");
      await loadCards();
    } catch (error) {
      setRedeemError(error instanceof Error ? error.message : "Card redemption failed");
    } finally {
      setRedeemBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070B1A] text-white pb-10">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Cards</h1>
          <p className="mt-2 text-sm text-slate-400">Manage Kashboy debit, virtual, physical, gift and reward cards.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[#0B1220]/90 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">Kashboy</div>
                  <div className="mt-2 text-2xl font-black text-white">Premium Debit Card</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black tracking-widest text-white">VISA</div>
              </div>

              <div className="mt-14 text-2xl font-bold tracking-[0.32em] text-white/90">•••• •••• •••• {activeCards[0]?.id.slice(-4).toUpperCase() || "4587"}</div>

              <div className="mt-10 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">Card Holder</div>
                  <div className="mt-2 text-sm font-semibold text-white">KASHBOY USER</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">Status</div>
                  <div className="mt-2 text-sm font-semibold text-emerald-300">{activeCards[0]?.status || "Placeholder"}</div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400">Activate Card</button>
                <button className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white hover:border-slate-500">Request Physical Card</button>
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
              <div className="text-sm font-semibold text-white">Virtual Card</div>
              <div className="mt-2 text-sm text-slate-400">Instant virtual card issuing is ready for backend activation.</div>
              <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-5 text-sm text-slate-400">Virtual card placeholder</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
              <div className="text-sm font-semibold text-white">Physical Card</div>
              <div className="mt-2 text-sm text-slate-400">Request and activation flow placeholder. Existing card records appear below.</div>
              <div className="mt-5 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300">Delivery address and KYC checks pending backend workflow.</div>
            </div>
          </section>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-[#0B1220]/85 p-5">
          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-900/40 p-1">
            <button
              onClick={() => setActiveTab("MY_CARDS")}
              className={`rounded-xl py-3 text-sm font-semibold transition-all ${activeTab === "MY_CARDS" ? "bg-emerald-500 text-black" : "text-slate-400"}`}
            >
              My Cards
            </button>
            <button
              onClick={() => setActiveTab("REDEEM")}
              className={`rounded-xl py-3 text-sm font-semibold transition-all ${activeTab === "REDEEM" ? "bg-emerald-500 text-black" : "text-slate-400"}`}
            >
              Redeem
            </button>
          </div>

          {activeTab === "MY_CARDS" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loading && <div className="text-sm text-slate-400">Loading cards...</div>}
              {!loading && cards.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-5 text-sm text-slate-400">
                  No reward or gift cards found yet.
                </div>
              )}
              {cards.map((card) => (
                <div key={card.id} className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-xl" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-bold text-white">{cardLabel(card.type)}</div>
                        <div className="mt-1 text-xs text-slate-400">{card.type.replace("_", " ")} • {card.currency}</div>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">{card.status}</span>
                    </div>
                    <div className="mt-8 text-xs uppercase tracking-wider text-slate-500">Card Balance</div>
                    <div className="mt-2 text-2xl font-black text-emerald-300">{formatCardValue(card.remainingValue, card.currency)}</div>
                    <div className="mt-6 text-xs text-slate-500">Code ending {card.id.slice(-6).toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-950/30 p-6">
              <div className="text-xl font-bold text-white">Redeem Card</div>
              <p className="mt-2 text-sm text-slate-400">Enter a Kashboy gift, reward or lifestyle card code.</p>
              <input
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                placeholder="Enter card code"
                className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
              />
              {redeemError && <div className="mt-4 rounded-xl border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">{redeemError}</div>}
              {redeemMessage && <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{redeemMessage}</div>}
              <button
                onClick={handleRedeem}
                disabled={redeemBusy}
                className="mt-5 w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
              >
                {redeemBusy ? "Redeeming..." : "Redeem Now"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
