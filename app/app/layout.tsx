"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import HollaLogo from "@/public/brand/components/HollaLogo";

const HEADER_H = 64;
const SIDEBAR_W = 280;

const sideNav = [
  { href: "/app/home", label: "SUMMARY", icon: SummaryIcon },
  { href: "/app/activity", label: "ACTIVITY", icon: ActivityIcon },
  { href: "/app/send-receive", label: "SEND /\nRECEIVE", icon: SendReceiveIcon },
  { href: "/app/help", label: "HELP", icon: HelpIcon },
  { href: "/app/settings", label: "SETTINGS", icon: SettingsIcon },
];

/* ── Icons ─────────────────────────────────────────────── */

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-200/15 bg-slate-900/40">
      {children}
    </span>
  );
}

function SummaryIcon() {
  return (
    <IconWrap>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
        <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 19V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 19V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 19V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 19V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </IconWrap>
  );
}

function ActivityIcon() {
  return (
    <IconWrap>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
        <path d="M4 12h4l2-6 4 12 2-6h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrap>
  );
}

function SendReceiveIcon() {
  return (
    <IconWrap>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
        <path d="M7 7h10l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 17H7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrap>
  );
}

function HelpIcon() {
  return (
    <IconWrap>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
        <path d="M12 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.8.6-1.2 1-1.2 2.2v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrap>
  );
}

function SettingsIcon() {
  return (
    <IconWrap>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2" />
        <path d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.2-2-3.5-2.3.6a8.2 8.2 0 0 0-1.7-1L13 5h-4l-.5 2.9a8.2 8.2 0 0 0-1.7 1L4.5 8.3l-2 3.5 2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.5 2.3-.6a8.2 8.2 0 0 0 1.7 1L9 19h4l.5-2.9a8.2 8.2 0 0 0 1.7-1l2.3.6 2-3.5-2-1.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </IconWrap>
  );
}

/* ── Hamburger button ───────────────────────────────────── */

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open ? (
        <>
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </>
      ) : (
        <>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </>
      )}
    </svg>
  );
}

/* ── Layout ─────────────────────────────────────────────── */

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();

  const mode = (sp.get("mode") || "cash").toLowerCase() === "crypto" ? "crypto" : "cash";

  const [userInitials, setUserInitials] = useState("ME");
  const [impersonated, setImpersonated] = useState(false);
  const [impersonatedUsername, setImpersonatedUsername] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.user) return;
        const u = d.user;
        if (u.fullName) {
          const parts = (u.fullName as string).trim().split(/\s+/);
          const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
          setUserInitials(initials);
        } else if (u.username) {
          setUserInitials((u.username as string).slice(0, 2).toUpperCase());
        }
        if (d.impersonated) {
          setImpersonated(true);
          setImpersonatedUsername(u.username || u.email || "user");
        }
      })
      .catch(() => {});
  }, []);

  // Close sidebar on route change (mobile nav link tap)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  async function exitImpersonation() {
    await fetch("/api/admin/exit-impersonate", { method: "POST" });
    router.push("/admin/dashboard");
  }

  async function handleLogout() {
    try { await fetch("/api/logout", { method: "POST" }); }
    finally { router.push("/login"); }
  }

  function isActive(href: string) {
    if (href === "/app/home") return pathname === "/app/home";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const showTopToggle = pathname === "/app/home" || pathname.startsWith("/app/send-receive");
  const toggleBase = pathname.startsWith("/app/send-receive") ? "/app/send-receive" : "/app/home";

  return (
    <div className="min-h-screen bg-[#070B1A] text-slate-100">

      {/* ── MOBILE OVERLAY ───────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── HEADER ───────────────────────────────────────── */}
      <header
        className="fixed left-0 top-0 z-50 w-full bg-[#070B1A]"
        style={{ height: HEADER_H }}
      >
        <div className="flex h-full items-center justify-between px-4 md:px-6">

          {/* LEFT — hamburger (mobile) + logo */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {/* Hamburger — mobile only */}
            <button
              type="button"
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              onClick={() => setSidebarOpen((p) => !p)}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white/80 hover:bg-white/[0.06] transition-colors lg:hidden"
            >
              <HamburgerIcon open={sidebarOpen} />
            </button>

            {/* Logo — base img is h-12; scale pushes visual out, so reserve space */}
            <Link
              href="/app/home"
              className="flex items-center"
              style={{ paddingLeft: 40, paddingRight: 20 }}
            >
              <HollaLogo variant="icon" className="scale-[3.0]" />
            </Link>
          </div>

          {/* CENTER — CASH / CRYPTO toggle */}
          {showTopToggle ? (
            <div className="flex items-center">
              <div className="flex items-center rounded-2xl border border-white/[0.1] bg-white/[0.04] p-1 gap-0.5">
                <Link
                  href={`${toggleBase}?mode=cash`}
                  className={[
                    "rounded-xl px-5 py-1.5 text-sm font-semibold tracking-wide transition-all duration-200",
                    mode === "cash"
                      ? "bg-emerald-500 text-black shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                      : "text-white/60 hover:text-white/90",
                  ].join(" ")}
                >
                  CASH
                </Link>
                <Link
                  href={`${toggleBase}?mode=crypto`}
                  className={[
                    "rounded-xl px-5 py-1.5 text-sm font-semibold tracking-wide transition-all duration-200",
                    mode === "crypto"
                      ? "bg-emerald-500 text-black shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                      : "text-white/60 hover:text-white/90",
                  ].join(" ")}
                >
                  CRYPTO
                </Link>
              </div>
            </div>
          ) : <div />}

          {/* RIGHT — secure indicator + account */}
          <div className="flex items-center gap-4 text-sm text-slate-200/80">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[13px]">Secure</span>
            </div>

            <div className="relative group">
              <button
                type="button"
                className="h-9 w-9 rounded-full bg-slate-900/40 flex items-center justify-center text-[13px] font-semibold text-emerald-300 border border-slate-200/20"
                title="Account"
              >
                {userInitials}
              </button>

              <div className="invisible opacity-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 transition-all absolute right-0 mt-3 w-44 rounded-2xl border border-slate-200/15 bg-[#070B1A] shadow-xl p-2">
                <Link
                  href="/app/settings"
                  className="block rounded-xl px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-900/50"
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left rounded-xl px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200/25 to-transparent" />
      </header>

      {/* ── IMPERSONATION BANNER ──────────────────────────── */}
      {impersonated && (
        <div
          className="fixed left-0 right-0 z-[100] flex items-center justify-between bg-orange-500 px-6 py-2 text-sm font-semibold text-white shadow-lg"
          style={{ top: HEADER_H }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Admin view — acting as <strong>@{impersonatedUsername}</strong>
          </div>
          <button
            onClick={exitImpersonation}
            className="rounded-lg border border-white/30 px-3 py-1 text-xs hover:bg-white/10 transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      {/* ── SIDEBAR ──────────────────────────────────────── */}
      <aside
        className={[
          "fixed left-0 z-40 bg-[#070B1A] transition-transform duration-300 ease-in-out",
          // Mobile: slide in/out; Desktop: always visible
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
        style={{
          top: HEADER_H,
          width: SIDEBAR_W,
          height: `calc(100vh - ${HEADER_H}px)`,
          overflowY: "auto",
        }}
      >
        {/* Right border gradient */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-200/20 to-transparent" />

        {/* Nav items */}
        <nav className="px-6 py-7">
          <div className="space-y-1">
            {sideNav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={[
                    "group flex items-center gap-3.5 rounded-xl px-3 py-3 transition-all duration-150",
                    active
                      ? "bg-emerald-500/10 text-white"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white/90",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex-shrink-0 transition-colors",
                      active ? "text-emerald-400" : "text-emerald-300/50 group-hover:text-emerald-300/80",
                    ].join(" ")}
                  >
                    <Icon />
                  </span>

                  <span
                    className="text-[15px] font-semibold leading-tight tracking-wide"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {item.label}
                  </span>

                  {/* Active indicator bar */}
                  {active && (
                    <span className="ml-auto h-5 w-[3px] rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Sidebar footer */}
          <div className="mt-8 border-t border-slate-200/10 pt-6">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-[14px] text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-slate-200/15 bg-slate-900/40">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span className="font-medium">Log out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <main
        className="relative min-h-screen bg-[#070B1A] transition-all duration-300"
        style={{
          paddingTop: HEADER_H + 24,
          paddingBottom: 32,
          paddingRight: 24,
        }}
      >
        {/* Desktop: push content right of sidebar. Mobile: no left offset. */}
        <style>{`
          @media (min-width: 1024px) {
            main { padding-left: ${SIDEBAR_W + 28}px; }
          }
          @media (max-width: 1023px) {
            main { padding-left: 20px; }
          }
        `}</style>

        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute top-0 left-32 h-[380px] w-[380px] rounded-full bg-emerald-500/[0.06] blur-[80px]" />
        {children}
      </main>
    </div>
  );
}
