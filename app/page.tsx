"use client";

import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#070B1A] text-white">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070B1A]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/holla-logo-transparent.png"
              alt="HOLLA"
              width={200}
              height={200}
              priority
            />
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-600"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
              Secure wallet • Fast transfers • Simple UX
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              THE VAULT — your modern money hub for Ghana and beyond.
            </h1>

            <p className="mt-4 text-white/70">
              Send money, receive/top up, and track transactions in one clean dashboard.
              Built with strong security fundamentals and a premium UI.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-600"
              >
                Create your account
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/15 px-6 py-3 font-semibold hover:bg-white/5"
              >
                Log in
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 text-sm text-white/70">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold">Fast</div>
                <div className="mt-1">Quick actions</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold">Secure</div>
                <div className="mt-1">JWT sessions</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-white font-semibold">Clean</div>
                <div className="mt-1">PayPal-style UX</div>
              </div>
            </div>
          </div>

          {/* Hero Card */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-2xl">
            <div className="rounded-xl bg-[#0B1230] p-5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Total balance</span>
                <span className="text-xs text-emerald-300">Demo</span>
              </div>
              <div className="mt-2 text-4xl font-bold text-emerald-300">
                GHS 0.00
              </div>
              <p className="mt-2 text-sm text-white/60">
                Your real balance will show here once wallets + ledger are connected.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button className="rounded-lg bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-600">
                  Send Money
                </button>
                <button className="rounded-lg border border-white/15 py-3 font-semibold hover:bg-white/5">
                  Receive / Top Up
                </button>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="text-sm font-semibold">Recent activity</div>
                <div className="mt-2 space-y-2 text-sm text-white/60">
                  <div className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>No transactions yet</span>
                    <span>—</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>Create an account to begin</span>
                    <span>—</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-white/50">
              This is a landing preview. Your real dashboard stays inside the app after login.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-white/60">
          © {new Date().getFullYear()} THE VAULT • Powered by HOLLA
        </div>
      </footer>
    </main>
  );
}