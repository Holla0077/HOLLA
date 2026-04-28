"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import HollaLogo from "@/public/brand/components/HollaLogo";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 002-2v-4M17 9l-5 5-5-5M12 4v10" />
      </svg>
    ),
    title: "Buy & Sell Crypto",
    desc: "Trade Bitcoin, Ethereum, USDT and more instantly with the best rates.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: "Gift Cards",
    desc: "Buy & sell popular gift cards at fair prices — coming soon.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "KashBoy to KashApp Transfers",
    desc: "Send money to any KashApp user for free — instant and secure.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    ),
    title: "KashBoy ATMs (Coming Soon)",
    desc: "Withdraw cash by scanning a QR code or using a Visa card — partner with Absa.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Instant MoMo Top-ups",
    desc: "Fund your wallet in seconds with MTN, Telecel, or AirtelTigo Mobile Money.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "KYC Verified & Secure",
    desc: "Bank-grade security with Ghana Card identity verification and JWT sessions.",
  },
];

const steps = [
  { num: "01", title: "Create your account", desc: "Sign up in under 60 seconds. No paperwork." },
  { num: "02", title: "Verify your identity", desc: "Upload your Ghana Card to unlock all features." },
  { num: "03", title: "Buy, send & spend", desc: "Trade crypto, buy gift cards, or withdraw cash at our ATMs." },
];

export default function LandingPage() {
  const [previewMode, setPreviewMode] = useState<"cash" | "crypto">("cash");

  return (
    <main className="min-h-screen bg-[#070B1A] text-white overflow-x-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#070B1A]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center">
  <div className="scale-[4]">
    <HollaLogo variant="icon" />
  </div>
</Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-5 pt-16 pb-20">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/[0.08] blur-[100px]" />

        <div className="relative flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Your All‑in‑One Money App · Launching Soon
          </span>

          <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.1] tracking-tight lg:text-6xl max-w-4xl">
            Buy, Sell & Spend{" "}
            <span className="text-emerald-400">Crypto</span>
            <br />Like Never Before
          </h1>

          <p className="mt-5 text-[1.05rem] leading-relaxed text-white/60 max-w-xl">
            KashBoy lets you trade crypto, buy gift cards, send money for free, and soon — withdraw cash at our smart ATMs.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-emerald-500 px-7 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors shadow-[0_0_30px_rgba(16,185,129,0.25)]"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/10 px-7 py-3 text-sm font-semibold text-white/80 hover:border-white/20 hover:text-white transition-colors"
            >
              Sign in
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap gap-4 text-xs text-white/40 justify-center">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              Secure Crypto Trading
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              Free P2P Transfers
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              Multipurpose ATMs Soon
            </span>
          </div>

          {/* Preview Card with Toggle (unchanged style) */}
          <div className="mt-14 w-full max-w-2xl">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 shadow-2xl backdrop-blur-sm">
              <div className="rounded-xl bg-[#0B1230] p-5 border border-white/[0.06]">
                <div className="flex justify-center mb-5">
                  <div className="inline-flex rounded-xl border border-white/[0.1] p-0.5">
                    <button
                      onClick={() => setPreviewMode("cash")}
                      className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        previewMode === "cash"
                          ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      Cash (GHS)
                    </button>
                    <button
                      onClick={() => setPreviewMode("crypto")}
                      className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        previewMode === "crypto"
                          ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      Crypto
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-white/40 font-medium uppercase tracking-wider">Total Balance</div>
                    <div className="mt-1.5 text-3xl font-bold text-emerald-300">
                      {previewMode === "cash" ? "GH₵ 0.00" : "₿ 0.00 BTC"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300">
                    Preview
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors">
                    {previewMode === "cash" ? "Fund Wallet" : "Trade"}
                  </button>
                  <button className="rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/80 hover:border-white/20 transition-colors">
                    {previewMode === "cash" ? "Withdraw" : "Send"}
                  </button>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.06]">
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                    {previewMode === "cash" ? "Recent Activity" : "Your Portfolio"}
                  </div>
                  <div className="space-y-2">
                    {previewMode === "cash" ? (
                      <>
                        {[
                          { label: "MoMo Top-up", amount: "+GH₵ 500", status: "completed" },
                          { label: "KashApp Transfer", amount: "-GH₵ 200", status: "completed" },
                          { label: "ATM Withdrawal", amount: "-GH₵ 150", status: "pending" },
                        ].map((tx, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
                            <span className="text-sm text-white/70">{tx.label}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${tx.amount.startsWith("+") ? "text-emerald-400" : "text-white/60"}`}>
                                {tx.amount}
                              </span>
                              <span className={`h-1.5 w-1.5 rounded-full ${tx.status === "completed" ? "bg-emerald-400" : "bg-yellow-400"}`} />
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {[
                          { asset: "Bitcoin", balance: "0.00 BTC", icon: "₿" },
                          { asset: "Ethereum", balance: "0.00 ETH", icon: "Ξ" },
                          { asset: "USDT (ERC-20)", balance: "0.00 USDT", icon: "₮" },
                        ].map((c, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-emerald-400/60">{c.icon}</span>
                              <span className="text-sm text-white/70">{c.asset}</span>
                            </div>
                            <span className="text-sm font-medium text-white/50">{c.balance}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-white/30">
                Demo preview — real dashboard after login
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES – updated with new services */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            The Future of Money in Ghana
          </h2>
          <p className="mt-3 text-white/50 max-w-xl mx-auto">
            KashBoy brings together crypto trading, gift cards, free transfers, and smart ATMs — all in one secure app.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all duration-200"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/15 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 sm:p-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Get started in 3 steps</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="text-4xl font-black text-emerald-500/20 leading-none">{s.num}</div>
                <h3 className="mt-2 font-semibold text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm text-white/50">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute right-0 top-5 h-px w-1/2 bg-gradient-to-r from-emerald-500/20 to-transparent" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-emerald-500 px-8 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors shadow-[0_0_30px_rgba(16,185,129,0.2)]"
            >
              Create your account — it&apos;s free
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07] mt-8">
        <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <div className="scale-[2.5]">
  <HollaLogo variant="icon" />
</div>
          </div>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/login" className="hover:text-white/60 transition-colors">Login</Link>
          </div>
          <div>© {new Date().getFullYear()} KashBoy. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}