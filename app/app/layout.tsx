"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import HollaLogo from "@/public/brand/components/HollaLogo";

const HEADER_H = 92; // compact but matches sketch proportions
const SIDEBAR_W = 320;

const sideNav = [
  { href: "/app/home", label: "SUMMARY", icon: SummaryIcon },
  { href: "/app/activity", label: "ACTIVITY", icon: ActivityIcon },
  { href: "/app/send-receive", label: "SEND /\nRECEIVE", icon: SendReceiveIcon },
  { href: "/app/help", label: "HELP", icon: HelpIcon },
  { href: "/app/settings", label: "SETTINGS", icon: SettingsIcon },
];

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-full border border-slate-200/20 bg-slate-900/30">
      {children}
    </span>
  );
}

function SummaryIcon() {
  return (
    <IconWrap>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-current">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-current">
        <path d="M4 12h4l2-6 4 12 2-6h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrap>
  );
}

function SendReceiveIcon() {
  return (
    <IconWrap>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-current">
        <path d="M7 7h10l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 17H7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrap>
  );
}

function HelpIcon() {
  return (
    <IconWrap>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-current">
        <path d="M12 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.8.6-1.2 1-1.2 2.2v.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </IconWrap>
  );
}

function SettingsIcon() {
  return (
    <IconWrap>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-current">
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.2-2-3.5-2.3.6a8.2 8.2 0 0 0-1.7-1L13 5h-4l-.5 2.9a8.2 8.2 0 0 0-1.7 1L4.5 8.3l-2 3.5 2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.5 2.3-.6a8.2 8.2 0 0 0 1.7 1L9 19h4l.5-2.9a8.2 8.2 0 0 0 1.7-1l2.3.6 2-3.5-2-1.2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </IconWrap>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();

  const mode = (sp.get("mode") || "cash").toLowerCase() === "crypto" ? "crypto" : "cash";

  const [userInitials, setUserInitials] = useState("ME");
  const [impersonated, setImpersonated] = useState(false);
  const [impersonatedUsername, setImpersonatedUsername] = useState("");

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

  async function exitImpersonation() {
    await fetch("/api/admin/exit-impersonate", { method: "POST" });
    router.push("/admin/dashboard");
  }

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  function isActive(href: string) {
    if (href === "/app/home") return pathname === "/app/home";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const showTopToggle =
  pathname === "/app/home" || pathname.startsWith("/app/send-receive");

const toggleBase =
  pathname.startsWith("/app/send-receive") ? "/app/send-receive" : "/app/home";

  return (
    <div className="min-h-screen bg-[#070B1A] text-slate-100">
      {/* FIXED TOP BAR */}
      <header
        className="fixed left-0 top-0 z-50 w-full bg-[#070B1A]"
        style={{ height: HEADER_H }}
      >
        <div className="h-full px-8">
          <div className="flex h-full items-center justify-between">
           {/* LEFT: logo */}
<Link
  href="/app/home"
  className="flex items-center justify-center"
  style={{ width: SIDEBAR_W }}
>
  <HollaLogo variant="icon" className="scale-[4.0]" />
</Link>

            {/* CENTER: CASH/CRYPTO toggle — pill segment control */}
            {showTopToggle ? (
              <div className="hidden md:flex items-center">
                <div className="flex items-center rounded-2xl border border-white/[0.1] bg-white/[0.04] p-1 gap-0.5">
                  <Link
                    href={`${toggleBase}?mode=cash`}
                    className={[
                      "relative rounded-xl px-7 py-2 text-sm font-semibold tracking-wide transition-all duration-200",
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
                      "relative rounded-xl px-7 py-2 text-sm font-semibold tracking-wide transition-all duration-200",
                      mode === "crypto"
                        ? "bg-emerald-500 text-black shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                        : "text-white/60 hover:text-white/90",
                    ].join(" ")}
                  >
                    CRYPTO
                  </Link>
                </div>
              </div>
            ) : (
              <div />
            )}

            {/* RIGHT: secure + account */}
            <div className="flex items-center gap-5 text-sm text-slate-200/80">
              <div className="hidden sm:flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Secure</span>
              </div>

              <div className="relative group">
                <button
                  type="button"
                  className="h-10 w-10 rounded-full bg-slate-900/40 flex items-center justify-center text-sm font-semibold text-emerald-300 border border-slate-200/20"
                  title="Account"
                >
                  {userInitials}
                </button>

                <div className="invisible opacity-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 transition-all absolute right-0 mt-3 w-48 rounded-2xl border border-slate-200/15 bg-[#070B1A] shadow-xl p-2">
                  <Link
                    href="/app/settings"
                    className="block rounded-xl px-4 py-3 text-base text-slate-200 hover:bg-slate-900/50"
                    style={{ fontFamily: "serif" }}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left rounded-xl px-4 py-3 text-base text-red-200 hover:bg-red-500/10"
                    style={{ fontFamily: "serif" }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DIVIDER LINE — premium gradient separator */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200/30 to-transparent" />
        </div>
      </header>

      {/* IMPERSONATION BANNER */}
      {impersonated && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between bg-orange-500 px-6 py-2 text-sm font-semibold text-white shadow-lg" style={{ marginTop: HEADER_H }}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Admin view — acting as <strong>@{impersonatedUsername}</strong>
          </div>
          <button onClick={exitImpersonation} className="rounded-lg border border-white/30 px-3 py-1 text-xs hover:bg-white/10 transition-colors">
            Exit
          </button>
        </div>
      )}

      {/* FIXED SIDEBAR */}
      <aside
        className="fixed left-0 z-40 bg-[#070B1A]"
        style={{
          top: HEADER_H,
          width: SIDEBAR_W,
          height: `calc(100vh - ${HEADER_H}px)`,
        }}
      >
        {/* Premium vertical divider — gradient fade top & bottom */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-200/20 to-transparent" />
        <div className="px-9 py-8">
  <div className="space-y-8">
  {sideNav.map((item) => {
  const active = isActive(item.href);
  const Icon = item.icon;

  return (
    <div key={item.href} className="relative">
      <Link
        href={item.href}
        className="group flex items-center gap-4"
        style={{ fontFamily: "serif" }}
      >
        {/* ICON */}
        <span
  className={[
    "transition-colors",
    active ? "text-emerald-300" : "text-emerald-300/60 group-hover:text-emerald-300/90",
  ].join(" ")}
>
  <Icon />
</span>


        <span
          className={[
            "leading-[1.05] tracking-wide transition-colors",
            active ? "text-white" : "text-white/75 group-hover:text-white/90",
          ].join(" ")}
          style={{
            whiteSpace: "pre-line",
            fontSize: 25,
          }}
        >
          {item.label}
        </span>
      </Link>

      <div
        className={[
          "mt-3 h-[3px] rounded-full transition-all duration-200",
          active
            ? "w-[92%] bg-emerald-400/90 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
            : "w-0 bg-emerald-400/0",
        ].join(" ")}
      />
    </div>
  );
})}
</div>
</div>
      </aside>

      {/* CONTENT AREA (scrolls; bars stay fixed) */}
      <main
        className="relative bg-[#070B1A]"
        style={{
          paddingTop: HEADER_H + 18,
          paddingLeft: SIDEBAR_W + 28,
          paddingRight: 28,
          paddingBottom: 28,
        }}
      >
        {/* Shared page glow — same atmosphere as Summary page */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute top-0 left-32 h-[420px] w-[420px] rounded-full bg-emerald-500/[0.07] blur-[80px]" />
        {children}
      </main>
    </div>
  );
}