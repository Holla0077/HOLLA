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
  verifiedAt: string | null;
  createdAt: string;
  _count: { transactions: number };
};

type SupportMessage = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  user: { id: string; username: string; email: string } | null;
};

type Tab = "USERS" | "SUPPORT";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("USERS");

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

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

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { if (tab === "SUPPORT") loadSupport(); }, [tab, loadSupport]);

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
      setConversations((prev) => prev.map((c) =>
        c.id === activeConvo.id ? { ...c, messages: [...c.messages, newMsg] } : c
      ));
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

  const pendingVerify = users.filter((u) => !u.isVerified).length;
  const openTickets = conversations.filter((c) => c.status === "OPEN").length;

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
        <span><span className={`font-semibold ${pendingVerify > 0 ? "text-yellow-400" : "text-white/70"}`}>{pendingVerify}</span> <span className="text-white/50">unverified</span></span>
        {tab === "SUPPORT" && <span><span className={`font-semibold ${openTickets > 0 ? "text-blue-400" : "text-white/70"}`}>{openTickets}</span> <span className="text-white/50">open tickets</span></span>}
      </div>

      {globalError && (
        <div className="mx-6 mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {globalError}
          <button className="ml-3 underline text-red-300" onClick={() => setGlobalError(null)}>Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pt-4 flex gap-2">
        {(["USERS", "SUPPORT"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-white/50 hover:text-white border border-transparent"}`}
          >
            {t === "USERS" ? "Users" : "Support"}
          </button>
        ))}
      </div>

      <div className="px-6 py-6">
        {/* USERS TAB */}
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
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/2.5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">@{u.username}</div>
                          <div className="text-white/40 text-xs">{u.email}</div>
                          {u.fullName && <div className="text-white/30 text-xs">{u.fullName}</div>}
                        </td>
                        <td className="px-4 py-3 text-white/60">{u.phone}</td>
                        <td className="px-4 py-3 text-white/50 whitespace-nowrap">{timeAgo(u.createdAt)}</td>
                        <td className="px-4 py-3 text-center">{u._count.transactions}</td>
                        <td className="px-4 py-3">
                          {u.isVerified ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Verified</span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            disabled={togglingId === u.id}
                            onClick={() => toggleVerify(u)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${u.isVerified ? "border-red-500/20 text-red-400 hover:bg-red-500/10" : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"}`}
                          >
                            {togglingId === u.id ? "…" : u.isVerified ? "Revoke" : "Verify"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-white/30 py-10">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SUPPORT TAB */}
        {tab === "SUPPORT" && (
          <div className="flex gap-4 h-[calc(100vh-220px)]">
            {/* Conversation list */}
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
                  <div className="text-xs text-white/30 mt-1 truncate">
                    {c.messages[c.messages.length - 1]?.body ?? "No messages"}
                  </div>
                  <div className="text-xs text-white/20 mt-1">{timeAgo(c.updatedAt)}</div>
                </button>
              ))}
            </div>

            {/* Chat panel */}
            <div className="flex-1 flex flex-col rounded-xl border border-white/10 overflow-hidden">
              {!activeConvo ? (
                <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Select a conversation to view</div>
              ) : (
                <>
                  <div className="border-b border-white/10 px-4 py-3 flex items-center gap-3">
                    <div>
                      <div className="font-medium text-sm">@{activeConvo.user?.username ?? "unknown"}</div>
                      <div className="text-xs text-white/40">{activeConvo.user?.email}</div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeConvo.messages.map((m) => (
                      <div key={m.id} className={`flex ${m.sender === "AGENT" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${
                          m.sender === "AGENT"
                            ? "bg-emerald-500/20 text-emerald-100"
                            : m.sender === "SYSTEM"
                            ? "bg-white/5 text-white/40 text-xs"
                            : "bg-white/10 text-white"
                        }`}>
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
                      <button
                        onClick={sendReply}
                        disabled={replying || !replyText.trim()}
                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
