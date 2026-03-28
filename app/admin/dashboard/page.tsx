"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  username: string;
  email: string;
  phone: string;
  fullName: string | null;
  isVerified: boolean;
  verificationStatus: string;
  verifiedAt: string | null;
  createdAt: string;
  _count: { transactions: number };
};

type KycDoc = {
  id: string;
  userId: string;
  frontPath: string;
  backPath: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: { id: string; username: string; email: string; phone: string; fullName: string | null; createdAt: string };
};

type AuditEntry = {
  id: string;
  action: string;
  targetUserId: string | null;
  meta: unknown;
  createdAt: string;
};

type SupportMessage = { id: string; sender: string; body: string; createdAt: string };
type Conversation = { id: string; userId: string; status: string; createdAt: string; updatedAt: string; messages: SupportMessage[]; user: { id: string; username: string; email: string } | null };

type UserDetail = {
  user: { id: string; username: string; email: string; phone: string; fullName: string | null; gender: string | null; dateOfBirth: string | null; isVerified: boolean; verificationStatus: string; createdAt: string };
  wallets: { id: string; asset: string; assetName: string; type: string; balance: string; balanceFmt: string }[];
  transactions: { id: string; status: string; rail: string; method: string; asset: string; amount: string; createdAt: string }[];
  kycDocument: KycDoc | null;
};

type Tab = "USERS" | "VERIFICATION" | "SUPPORT" | "AUDIT";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function kycImg(userId: string, filename: string) {
  return `/api/kyc-image/${userId}/${filename}`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("USERS");

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  const [kycDocs, setKycDocs] = useState<KycDoc[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycFilter, setKycFilter] = useState<string>("PENDING");
  const [selectedKyc, setSelectedKyc] = useState<KycDoc | null>(null);
  const [kycNote, setKycNote] = useState("");
  const [kycBusy, setKycBusy] = useState(false);
  const [kycActionMsg, setKycActionMsg] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setGlobalError("Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, [router]);

  const loadKyc = useCallback(async () => {
    setKycLoading(true);
    try {
      const res = await fetch("/api/admin/kyc");
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setKycDocs(data.docs ?? []);
    } catch {
      setGlobalError("Failed to load KYC documents.");
    } finally {
      setKycLoading(false);
    }
  }, [router]);

  const loadSupport = useCallback(async () => {
    setSupportLoading(true);
    try {
      const res = await fetch("/api/admin/support");
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      setGlobalError("Failed to load support.");
    } finally {
      setSupportLoading(false);
    }
  }, [router]);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/admin/audit");
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setAuditLogs(data.logs ?? []);
    } catch {
      setGlobalError("Failed to load audit log.");
    } finally {
      setAuditLoading(false);
    }
  }, [router]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => {
    if (tab === "SUPPORT") loadSupport();
    else if (tab === "VERIFICATION") loadKyc();
    else if (tab === "AUDIT") loadAudit();
  }, [tab, loadSupport, loadKyc, loadAudit]);

  async function toggleVerify(user: User) {
    setTogglingId(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isVerified: !user.isVerified }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isVerified: !u.isVerified } : u));
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Failed to update user.");
    } finally {
      setTogglingId(null);
    }
  }

  async function reviewKyc(action: "approve" | "reject") {
    if (!selectedKyc) return;
    setKycBusy(true);
    setKycActionMsg(null);
    try {
      const res = await fetch("/api/admin/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kycId: selectedKyc.id, action, adminNote: kycNote || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKycActionMsg(action === "approve" ? "Approved — user is now verified." : "Rejected — user has been notified.");
      setKycDocs((prev) => prev.map((d) => d.id === selectedKyc.id ? { ...d, status: data.status } : d));
      setSelectedKyc((d) => d ? { ...d, status: data.status } : d);
      await loadUsers();
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Failed to review KYC.");
    } finally {
      setKycBusy(false);
    }
  }

  async function openUserDetail(userId: string) {
    setUserDetail(null);
    setUserDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUserDetail(data);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Failed to load user detail.");
    } finally {
      setUserDetailLoading(false);
    }
  }

  async function impersonate(userId: string) {
    setImpersonating(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(data.redirect || "/app/home");
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Failed to impersonate user.");
      setImpersonating(false);
    }
  }

  async function sendReply() {
    if (!activeConvo || !replyText.trim()) return;
    setReplying(true);
    setReplyError(null);
    try {
      const res = await fetch("/api/admin/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvo.id, body: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const newMsg: SupportMessage = data.message;
      setActiveConvo((c) => c ? { ...c, messages: [...c.messages, newMsg] } : c);
      setConversations((prev) => prev.map((c) => c.id === activeConvo.id ? { ...c, messages: [...c.messages, newMsg] } : c));
      setReplyText("");
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : "Failed to send reply.");
    } finally {
      setReplying(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.fullName || "").toLowerCase().includes(q);
  });

  const filteredKyc = kycDocs.filter((d) => kycFilter === "ALL" || d.status === kycFilter);
  const pendingKyc = kycDocs.filter((d) => d.status === "PENDING").length;
  const openTickets = conversations.filter((c) => c.status === "OPEN").length;

  const tabLabels: Record<Tab, string> = {
    USERS: "Users",
    VERIFICATION: `Verification${pendingKyc > 0 ? ` (${pendingKyc})` : ""}`,
    SUPPORT: "Support",
    AUDIT: "Audit Log",
  };

  function vStatusPill(s: string) {
    if (s === "APPROVED") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    if (s === "PENDING") return "bg-yellow-500/10 text-yellow-300 border-yellow-500/20";
    if (s === "REJECTED") return "bg-red-500/10 text-red-300 border-red-500/20";
    return "bg-white/5 text-white/40 border-white/10";
  }

  return (
    <main className="min-h-screen bg-[#070B1A] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Admin Panel <span className="text-white/40 font-normal text-sm">· KashBoy / Holla</span></h1>
        </div>
        <button onClick={logout} className="text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-colors">
          Log out
        </button>
      </header>

      {/* Stats bar */}
      <div className="border-b border-white/10 px-6 py-3 flex gap-6 text-sm">
        <span><span className="font-semibold text-emerald-400">{users.length}</span> <span className="text-white/50">users</span></span>
        <span><span className={`font-semibold ${pendingKyc > 0 ? "text-yellow-400" : "text-white/70"}`}>{pendingKyc}</span> <span className="text-white/50">pending KYC</span></span>
        {tab === "SUPPORT" && <span><span className={`font-semibold ${openTickets > 0 ? "text-blue-400" : "text-white/70"}`}>{openTickets}</span> <span className="text-white/50">open tickets</span></span>}
      </div>

      {globalError && (
        <div className="mx-6 mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {globalError}
          <button className="ml-3 underline text-red-300" onClick={() => setGlobalError(null)}>Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pt-4 flex gap-2 flex-wrap">
        {(["USERS", "VERIFICATION", "SUPPORT", "AUDIT"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-white/50 hover:text-white border border-transparent"}`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className="px-6 py-6">

        {/* ── USERS TAB ── */}
        {tab === "USERS" && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by username, email, or name…"
                className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-white/30"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            {usersLoading ? (
              <div className="text-white/40 text-sm py-8 text-center">Loading users…</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 text-left">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                      <th className="px-4 py-3 font-medium">Txns</th>
                      <th className="px-4 py-3 font-medium">KYC Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.025] transition-colors">
                        <td className="px-4 py-3">
                          <button className="text-left hover:text-emerald-300 transition-colors" onClick={() => openUserDetail(u.id)}>
                            <div className="font-medium">@{u.username}</div>
                            <div className="text-white/40 text-xs">{u.email}</div>
                            {u.fullName && <div className="text-white/30 text-xs">{u.fullName}</div>}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-white/60">{u.phone}</td>
                        <td className="px-4 py-3 text-white/50 whitespace-nowrap">{timeAgo(u.createdAt)}</td>
                        <td className="px-4 py-3 text-center">{u._count.transactions}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full border ${vStatusPill(u.verificationStatus ?? "NONE")}`}>
                            {u.verificationStatus ?? "NONE"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              disabled={togglingId === u.id}
                              onClick={() => toggleVerify(u)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${u.isVerified ? "border-red-500/20 text-red-400 hover:bg-red-500/10" : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"}`}
                            >
                              {togglingId === u.id ? "…" : u.isVerified ? "Revoke" : "Verify"}
                            </button>
                            <button
                              onClick={() => openUserDetail(u.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-white/30 py-10">No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── VERIFICATION TAB ── */}
        {tab === "VERIFICATION" && (
          <div className="flex gap-6 h-[calc(100vh-230px)]">
            {/* Left: KYC queue */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-3">
              <div className="flex gap-2">
                {["PENDING", "APPROVED", "REJECTED", "ALL"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setKycFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${kycFilter === f ? "bg-white/10 border-white/20 text-white" : "border-transparent text-white/40 hover:text-white"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
                {kycLoading ? (
                  <div className="text-white/40 text-sm text-center py-8">Loading…</div>
                ) : filteredKyc.length === 0 ? (
                  <div className="text-white/30 text-sm text-center py-8">No KYC submissions.</div>
                ) : filteredKyc.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => { setSelectedKyc(doc); setKycNote(""); setKycActionMsg(null); }}
                    className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${selectedKyc?.id === doc.id ? "bg-white/5" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">@{doc.user.username}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${vStatusPill(doc.status)}`}>{doc.status}</span>
                    </div>
                    <div className="text-xs text-white/40">{doc.user.email}</div>
                    <div className="text-xs text-white/30 mt-1">{timeAgo(doc.createdAt)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: KYC detail */}
            <div className="flex-1 rounded-xl border border-white/10 overflow-y-auto">
              {!selectedKyc ? (
                <div className="h-full flex items-center justify-center text-white/30 text-sm">Select a submission to review</div>
              ) : (
                <div className="p-6 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white">@{selectedKyc.user.username}</div>
                      <div className="text-sm text-white/50">{selectedKyc.user.email} · {selectedKyc.user.phone}</div>
                      {selectedKyc.user.fullName && <div className="text-sm text-white/40">{selectedKyc.user.fullName}</div>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${vStatusPill(selectedKyc.status)}`}>{selectedKyc.status}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-white/40 mb-2">Front of Ghana Card</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={kycImg(selectedKyc.userId, selectedKyc.frontPath.split("/").pop() ?? "")}
                        alt="Front"
                        className="w-full rounded-xl border border-white/10 object-contain bg-black/30"
                        style={{ maxHeight: 220 }}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-white/40 mb-2">Back of Ghana Card</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={kycImg(selectedKyc.userId, selectedKyc.backPath.split("/").pop() ?? "")}
                        alt="Back"
                        className="w-full rounded-xl border border-white/10 object-contain bg-black/30"
                        style={{ maxHeight: 220 }}
                      />
                    </div>
                  </div>

                  {selectedKyc.adminNote && (
                    <div className="text-sm text-white/50 bg-white/5 rounded-xl px-4 py-3">
                      <span className="text-white/30 text-xs mr-1">Note:</span>{selectedKyc.adminNote}
                    </div>
                  )}

                  {selectedKyc.status === "PENDING" && (
                    <div className="space-y-3">
                      <textarea
                        rows={2}
                        placeholder="Admin note (optional — shown to compliance, not user)…"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20 placeholder:text-white/25 resize-none"
                        value={kycNote}
                        onChange={(e) => setKycNote(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => reviewKyc("approve")}
                          disabled={kycBusy}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
                        >
                          {kycBusy ? "…" : "Approve"}
                        </button>
                        <button
                          onClick={() => reviewKyc("reject")}
                          disabled={kycBusy}
                          className="flex-1 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-300 font-semibold rounded-xl px-4 py-2.5 text-sm border border-red-500/20 transition-colors"
                        >
                          {kycBusy ? "…" : "Reject"}
                        </button>
                      </div>
                      {kycActionMsg && <div className="text-sm text-emerald-300 bg-emerald-500/10 rounded-xl px-4 py-3 border border-emerald-500/20">{kycActionMsg}</div>}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => openUserDetail(selectedKyc.userId)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors"
                    >
                      View Full Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SUPPORT TAB ── */}
        {tab === "SUPPORT" && (
          <div className="flex gap-4 h-[calc(100vh-220px)]">
            <div className="w-72 flex-shrink-0 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
              {supportLoading ? (
                <div className="text-white/40 text-sm text-center py-8">Loading…</div>
              ) : conversations.length === 0 ? (
                <div className="text-white/40 text-sm text-center py-8">No support tickets.</div>
              ) : conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConvo(c)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${activeConvo?.id === c.id ? "bg-white/5" : ""}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-sm">@{c.user?.username ?? "unknown"}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${c.status === "OPEN" ? "border-blue-500/20 text-blue-300 bg-blue-500/10" : "border-white/10 text-white/40"}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs text-white/40">{c.user?.email}</div>
                  <div className="text-xs text-white/30 mt-1 truncate">{c.messages[c.messages.length - 1]?.body ?? "No messages"}</div>
                  <div className="text-xs text-white/20 mt-1">{timeAgo(c.updatedAt)}</div>
                </button>
              ))}
            </div>
            <div className="flex-1 flex flex-col rounded-xl border border-white/10 overflow-hidden">
              {!activeConvo ? (
                <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Select a conversation to view</div>
              ) : (
                <>
                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="font-medium text-sm">@{activeConvo.user?.username ?? "unknown"}</div>
                    <div className="text-xs text-white/40">{activeConvo.user?.email}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeConvo.messages.map((m) => (
                      <div key={m.id} className={`flex ${m.sender === "AGENT" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${m.sender === "AGENT" ? "bg-emerald-500/20 text-emerald-100" : m.sender === "SYSTEM" ? "bg-white/5 text-white/40 text-xs" : "bg-white/10 text-white"}`}>
                          {m.body}
                          <div className="text-xs opacity-50 mt-1">{m.sender} · {timeAgo(m.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 p-4">
                    {replyError && <p className="text-red-400 text-xs mb-2">{replyError}</p>}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a reply…"
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40 placeholder:text-white/30"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                      />
                      <button onClick={sendReply} disabled={replying || !replyText.trim()} className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">Send</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── AUDIT LOG TAB ── */}
        {tab === "AUDIT" && (
          <div>
            {auditLoading ? (
              <div className="text-white/40 text-sm text-center py-8">Loading…</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 text-left">
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Target User ID</th>
                      <th className="px-4 py-3 font-medium">Meta</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((l) => (
                      <tr key={l.id} className="border-b border-white/5 hover:bg-white/[0.025] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-emerald-300">{l.action}</td>
                        <td className="px-4 py-3 text-white/50 text-xs font-mono">{l.targetUserId ?? "—"}</td>
                        <td className="px-4 py-3 text-white/40 text-xs truncate max-w-xs">{l.meta ? JSON.stringify(l.meta) : "—"}</td>
                        <td className="px-4 py-3 text-white/40 whitespace-nowrap text-xs">{timeAgo(l.createdAt)}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={4} className="text-center text-white/30 py-10">No audit entries.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── USER DETAIL SLIDE PANEL ── */}
      {(userDetail || userDetailLoading) && (
        <div className="fixed inset-0 z-50 flex" onClick={() => { setUserDetail(null); setUserDetailLoading(false); }}>
          <div className="flex-1 bg-black/50" />
          <div
            className="w-full max-w-2xl bg-[#0A0F1E] border-l border-white/10 overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="font-bold text-white">User Detail</h2>
              <button onClick={() => { setUserDetail(null); setUserDetailLoading(false); }} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>

            {userDetailLoading ? (
              <div className="flex items-center justify-center py-16 text-white/30 text-sm">Loading…</div>
            ) : userDetail ? (
              <div className="px-6 py-6 space-y-6">
                {/* Profile */}
                <div className="space-y-1">
                  <div className="text-lg font-bold text-white">@{userDetail.user.username}</div>
                  <div className="text-sm text-white/50">{userDetail.user.email} · {userDetail.user.phone}</div>
                  {userDetail.user.fullName && <div className="text-sm text-white/40">{userDetail.user.fullName}</div>}
                  <div className="flex gap-2 pt-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${vStatusPill(userDetail.user.verificationStatus)}`}>
                      {userDetail.user.verificationStatus}
                    </span>
                    <span className="text-xs text-white/30">Joined {timeAgo(userDetail.user.createdAt)}</span>
                  </div>
                </div>

                {/* Act as button */}
                <button
                  onClick={() => impersonate(userDetail.user.id)}
                  disabled={impersonating}
                  className="w-full bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 font-semibold rounded-xl px-4 py-3 text-sm transition-colors disabled:opacity-50"
                >
                  {impersonating ? "Opening session…" : `Act as @${userDetail.user.username}`}
                </button>

                {/* Wallets */}
                <div>
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Wallets</div>
                  <div className="space-y-2">
                    {userDetail.wallets.map((w) => (
                      <div key={w.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/3 px-4 py-2.5">
                        <div>
                          <span className="text-sm font-medium text-white">{w.asset}</span>
                          <span className="text-xs text-white/40 ml-2">{w.assetName}</span>
                        </div>
                        <span className="text-sm font-semibold text-emerald-300">{w.balanceFmt}</span>
                      </div>
                    ))}
                    {userDetail.wallets.length === 0 && <div className="text-white/30 text-sm">No wallets.</div>}
                  </div>
                </div>

                {/* Recent transactions */}
                <div>
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Recent Transactions</div>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40">
                          <th className="px-3 py-2 font-medium text-left">Status</th>
                          <th className="px-3 py-2 font-medium text-left">Method</th>
                          <th className="px-3 py-2 font-medium text-left">Asset</th>
                          <th className="px-3 py-2 font-medium text-left">Amount</th>
                          <th className="px-3 py-2 font-medium text-left">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetail.transactions.map((t) => (
                          <tr key={t.id} className="border-b border-white/5">
                            <td className="px-3 py-2">
                              <span className={`rounded-full px-1.5 py-0.5 ${t.status === "COMPLETED" ? "text-emerald-300" : t.status === "PENDING" ? "text-yellow-300" : "text-red-300"}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-white/60 font-mono">{t.method}</td>
                            <td className="px-3 py-2 text-white/60">{t.asset}</td>
                            <td className="px-3 py-2 text-white/60 font-mono">{t.amount}</td>
                            <td className="px-3 py-2 text-white/40">{timeAgo(t.createdAt)}</td>
                          </tr>
                        ))}
                        {userDetail.transactions.length === 0 && (
                          <tr><td colSpan={5} className="text-center text-white/30 py-6">No transactions.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
