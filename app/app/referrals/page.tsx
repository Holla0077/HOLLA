"use client";

import { useEffect, useState } from "react";

type ReferralSummary = {
  pointsBalance: number;
  referralCode: string;
  totalReferrals: number;
  lifetimeRewards: number;
  bonus: string;
  history: Array<{
    id: string;
    name: string;
    reward: number;
    createdAt: string;
  }>;
};

export default function ReferralsPage() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch((error) => console.error(error));
  }, []);

  const referralCode = summary?.referralCode ?? "KASH";

  async function copyReferralCode() {
    await navigator.clipboard?.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="min-h-screen bg-[#070B1A] text-white pb-10">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
          <p className="mt-2 text-sm text-slate-400">Earn KASH Points by inviting people into Kashboy.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[#0B1220]/90 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
            <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="relative">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">KASH Points</div>
              <div className="mt-4 text-6xl font-black tracking-tight text-white">{summary?.pointsBalance ?? 0}</div>
              <div className="mt-3 text-sm text-slate-400">Current rewards balance</div>

              <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/30 p-5">
                <div className="text-xs uppercase tracking-wider text-slate-500">Referral Code</div>
                <div className="mt-2 break-all text-3xl font-black text-white">{referralCode}</div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={copyReferralCode}
                    className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black hover:bg-emerald-400"
                  >
                    {copied ? "Copied" : "Copy Referral Code"}
                  </button>
                  <button className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white hover:border-slate-500">
                    Share Referral Code
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
              <div className="text-sm text-slate-400">Total Referrals</div>
              <div className="mt-3 text-4xl font-black text-white">{summary?.totalReferrals ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
              <div className="text-sm text-slate-400">Lifetime Rewards Earned</div>
              <div className="mt-3 text-4xl font-black text-emerald-300">{summary?.lifetimeRewards ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 sm:col-span-2 lg:col-span-1">
              <div className="text-base font-bold text-white">Referral Bonus</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                {summary?.bonus ?? "Invite friends and earn KASH Points when referral rewards go live."}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-[#0B1220]/85 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="text-xl font-semibold text-white">Referral History</div>
            <div className="text-xs text-slate-500">Rewards ledger placeholder until referral tables are added.</div>
          </div>

          {(summary?.history ?? []).length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 text-sm text-slate-400">
              No referral history yet.
            </div>
          ) : (
            <div className="space-y-3">
              {summary?.history.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                  <div>
                    <div className="font-semibold text-white">{item.name}</div>
                    <div className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="font-bold text-emerald-300">+{item.reward} KASH</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
