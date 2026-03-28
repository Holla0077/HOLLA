"use client";

import Link from "next/link";
import Image from "next/image";

const features = [
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    title: "Send & Receive",
    desc: "Transfer GHS instantly to any KashBoy user — no fees, no delays.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "GHS & Crypto Wallets",
    desc: "Manage your fiat and crypto assets side by side — BTC, ETH, USDT and more.",
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
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: "Visa / Card Payments",
    desc: "Top up or withdraw directly to your debit or credit card. Fast and simple.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: "Full Transaction History",
    desc: "Every topup, transfer, and withdrawal tracked with real-time status updates.",
  },
];

const steps = [
  { num: "01", title: "Create your account", desc: "Sign up in under 60 seconds. No paperwork." },
  { num: "02", title: "Verify your identity", desc: "Upload your Ghana Card to unlock all features." },
  { num: "03", title: "Fund & transact", desc: "Top up via MoMo or card, then send, receive, or trade." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#070B1A] text-white overflow-x-hidden">

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#070B1A]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/brand/holla-logo-transparent.png"
              alt="KashBoy"
              width={120}
              height={40}
              priority
              className="h-9 w-auto"
            />
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
      <section className="relative mx-auto max-w-6xl px-5 pt-20 pb-16">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/[0.08] blur-[100px]" />

        <div className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Built for Ghana · Launching Soon
            </span>

            <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.1] tracking-tight lg:text-[3.5rem]">
              Your Smart{" "}
              <span className="text-emerald-400">Money</span>
              <br />Companion
            </h1>

            <p className="mt-5 text-[1.05rem] leading-relaxed text-white/60 max-w-lg">
              KashBoy is your all-in-one digital wallet for Ghana. Send, receive, and
              manage GHS and crypto — all from one clean, secure dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
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
            <div className="mt-10 flex flex-wrap gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                MTN MoMo integrated
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                Ghana Card KYC
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                End-to-end encrypted
              </span>
            </div>
          </div>

          {/* Right — app preview card */}
          <div className="relative">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 shadow-2xl backdrop-blur-sm">
              <div className="rounded-xl bg-[#0B1230] p-5 border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-white/40 font-medium uppercase tracking-wider">Total Balance</div>
                    <div className="mt-1.5 text-3xl font-bold text-emerald-300">GH₵ 0.00</div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300">
                    Preview
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors">
                    Fund Wallet
                  </button>
                  <button className="rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/80 hover:border-white/20 transition-colors">
                    Withdraw
                  </button>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.06]">
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Recent Activity</div>
                  <div className="space-y-2">
                    {[
                      { label: "MoMo Top-up", amount: "+GH₵ 500", status: "completed" },
                      { label: "Holla Transfer", amount: "-GH₵ 200", status: "completed" },
                      { label: "Visa Withdrawal", amount: "-GH₵ 150", status: "pending" },
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
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-white/30">
                Demo preview — your real dashboard loads after login
              </p>
            </div>

            {/* Floating badge */}
            <div className="absolute -right-4 -top-4 rounded-2xl border border-emerald-500/20 bg-[#0B1230] px-3 py-2 shadow-xl">
              <div className="text-xs text-white/50">Wallets</div>
              <div className="mt-0.5 text-sm font-bold text-emerald-300">GHS · BTC · ETH</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need to manage money in Ghana
          </h2>
          <p className="mt-3 text-white/50 max-w-xl mx-auto">
            Built from the ground up for the Ghanaian market, with the features that actually matter.
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
            <Image src="/brand/holla-logo-transparent.png" alt="KashBoy" width={80} height={28} className="h-6 w-auto opacity-60" />
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
