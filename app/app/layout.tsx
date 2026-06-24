"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import HollaLogo from "@/public/brand/components/HollaLogo";

const HEADER_H = 64;
const SIDEBAR_W = 280;

const sideNav = [
  { href: "/app/home", label: "Dashboard", icon: DashboardIcon },
  { href: "/app/activity", label: "Activity", icon: ActivityIcon },
  { href: "/app/crypto", label: "Crypto", icon: CryptoIcon },
  { href: "/app/cards", label: "Cards", icon: CardsIcon },
  { href: "/app/referrals", label: "Referrals", icon: ReferralsIcon },
  { href: "/app/settings", label: "Settings", icon: SettingsIcon },
];

// TODO: Replace this local preview list with a protected notifications API
// when notification persistence is added to the backend.
const notificationPreview = [
  {
    id: "topup-received",
    icon: "₵",
    title: "Wallet top-up received",
    message: "Your GHS wallet top-up request has been received.",
    time: "2 min ago",
    unread: true,
    category: "Transactions",
  },
  {
    id: "withdrawal-update",
    icon: "↗",
    title: "Withdrawal request update",
    message: "Your withdrawal request is pending provider confirmation.",
    time: "18 min ago",
    unread: true,
    category: "Transactions",
  },
  {
    id: "card-activation",
    icon: "◆",
    title: "Card activation reminder",
    message: "Activate your Kashboy card to unlock card rewards.",
    time: "1 hr ago",
    unread: false,
    category: "Cards",
  },
  {
    id: "login-alert",
    icon: "!",
    title: "Login/security alert",
    message: "A new login was detected on your account.",
    time: "Today",
    unread: true,
    category: "Security",
  },
];

/* ── Icons ─────────────────────────────────────────────── */
function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-200/15 bg-slate-900/40">
      {children}
    </span>
  );
}

function DashboardIcon() {
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

function CryptoIcon() {
  return (
    <IconWrap>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </IconWrap>
  );
}

function CardsIcon() {
  return (
    <IconWrap>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
        <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M1 10h22" stroke="currentColor" strokeWidth="2" />
      </svg>
    </IconWrap>
  );
}

function ReferralsIcon() {
  return (
    <IconWrap>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

  const [userInitials, setUserInitials] = useState("ME");
  const [fullName, setFullName] = useState("");
  const [impersonated, setImpersonated] = useState(false);
  const [impersonatedUsername, setImpersonatedUsername] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(notificationPreview);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const unreadNotifications = notifications.filter((item) => item.unread).length;

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
          setFullName(u.fullName);
        } else if (u.username) {
          setUserInitials((u.username as string).slice(0, 2).toUpperCase());
          setFullName(u.username);
        }
        if (d.impersonated) {
          setImpersonated(true);
          setImpersonatedUsername(u.username || u.email || "user");
        }
      })
      .catch(() => {});
  }, []);

  // Close sidebar on route change (mobile nav link tap)
  useEffect(() => {
    setSidebarOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/app/activity?search=${encodeURIComponent(searchQuery)}`);
    }
  };

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
          <div className="flex flex-shrink-0 items-center gap-4">
            <button
              type="button"
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              onClick={() => setSidebarOpen((p) => !p)}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white/80 hover:bg-white/[0.06] transition-colors lg:hidden"
            >
              <HamburgerIcon open={sidebarOpen} />
            </button>

            <Link href="/app/home" className="ml-2 flex items-center shrink-0 sm:ml-18">
  <HollaLogo variant="icon" className="scale-[4] sm:scale-[4] translate-y-2" />
</Link>
          </div>

          {/* CENTER — search bar */}
          <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-xl mx-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything..."
                className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-700 bg-slate-900/60 text-sm text-white placeholder-slate-400 outline-none focus:border-emerald-400"
              />
            </div>
          </form>

          {/* RIGHT — notification + user profile */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative h-9 w-9 rounded-full border border-slate-700 bg-slate-900/40 flex items-center justify-center text-slate-300 hover:border-slate-500 transition-colors"
                title="Notifications"
                aria-expanded={notificationsOpen}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 text-[10px] font-bold flex items-center justify-center">{unreadNotifications}</span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200/15 bg-[#070B1A] shadow-2xl shadow-black/40">
                  <div className="border-b border-slate-800 bg-slate-900/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">Notifications</div>
                        <div className="text-xs text-slate-400">Wallet, card and security alerts</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifications((items) => items.map((item) => ({ ...item, unread: false })))}
                        className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:border-emerald-500/60"
                      >
                        Mark all read
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 text-center">
                        <div className="text-sm font-semibold text-white">No notifications yet</div>
                        <div className="mt-1 text-xs text-slate-400">Wallet, card and security alerts will appear here.</div>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedNotification(item.id);
                            setNotifications((items) =>
                              items.map((notification) =>
                                notification.id === item.id ? { ...notification, unread: false } : notification
                              )
                            );
                          }}
                          className="w-full rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-slate-700 hover:bg-slate-900/40"
                        >
                          <div className="flex gap-3">
                            <div className="relative grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-950/50 text-sm font-black text-emerald-300">
                              {item.icon}
                              {item.unread && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="truncate text-sm font-semibold text-white">{item.title}</div>
                                <div className="flex-shrink-0 text-[11px] text-slate-500">{item.time}</div>
                              </div>
                              <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{item.message}</div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                                  {item.category}
                                </span>
                                {selectedNotification === item.id && (
                                  <span className="text-[10px] text-slate-500">Preview selected</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-800 bg-slate-900/30 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setNotifications((items) => items.filter((item) => item.unread))}
                      className="w-full rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
                    >
                      Clear read notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User profile */}
            <div className="relative group">
              <button className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-300">
                  {userInitials}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-sm font-medium text-white">{fullName || "User"}</div>
                  <div className="text-xs text-emerald-400">Verified</div>
                </div>
                <svg className="hidden lg:block w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
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
        <nav className="px-6 py-7 flex flex-col h-full">
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

                  <span className="text-[15px] font-semibold leading-tight tracking-wide">
                    {item.label}
                  </span>

                  {active && (
                    <span className="ml-auto h-5 w-[3px] rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Sidebar footer */}
          <div className="mt-auto border-t border-slate-200/10 pt-6 space-y-1">
            <Link
              href="/app/help"
              className="flex items-center gap-3.5 rounded-xl px-3 py-3 text-[14px] text-slate-400 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
            >
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-slate-200/15 bg-slate-900/40">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 18h.01" />
                  <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.8.6-1.2 1-1.2 2.2v.5" />
                </svg>
              </span>
              Help Center
            </Link>
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
              Logout
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
