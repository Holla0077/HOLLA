"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type SupportConversation = {
  id: string;
  status: "OPEN" | "CLOSED";
  createdAt?: string;
};

type SupportMessage = {
  id: string;
  conversationId: string;
  sender: "USER" | "AGENT" | "SYSTEM";
  body: string;
  createdAt: string;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

async function readJsonSafe(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  return { error: text || `Non-JSON response (${res.status})` };
}

export default function HelpChatPage() {
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => {
    return conversation?.status === "OPEN" && text.trim().length > 0 && !sending;
  }, [conversation?.status, text, sending]);

  async function readJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Expected JSON but got: ${text.slice(0, 120)}`);
  }
  return res.json();
}

async function loadConversation(): Promise<SupportConversation> {
  const res = await fetch("/api/support/conversations", { cache: "no-store" });
  const data = await readJson(res);

  if (!res.ok) throw new Error(data?.error || "Failed to load conversation");
  if (!data?.conversation?.id) throw new Error("Conversation not returned by API");

  setConversation(data.conversation);
  return data.conversation as SupportConversation;
}


  async function loadMessages(conversationId: string) {
    const res = await fetch(`/api/support/messages?conversationId=${encodeURIComponent(conversationId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load messages");
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }

  // initial load
  useEffect(() => {
  let alive = true;

  (async () => {
    try {
      setLoading(true);
      const convo = await loadConversation();
      if (!alive) return;

      await loadMessages(convo.id); // ✅ no underline now
    } catch (e: unknown) {
      if (!alive) return;
      const message = e instanceof Error ? e.message : "Failed";
      setErr(message);
    } finally {
      if (!alive) return;
      setLoading(false);
    }
  })();

  return () => {
    alive = false;
  };
}, []);

  // polling (simple “realtime”)
  useEffect(() => {
    if (!conversation?.id) return;

    const t = setInterval(() => {
      loadMessages(conversation.id).catch(() => {});
    }, 2500);

    return () => clearInterval(t);
  }, [conversation?.id]);

  // auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!conversation) return;

    const body = text.trim();
    if (!body) return;

    setSending(true);
    setErr(null);

    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id, body }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Send failed");

      setText("");
      await loadMessages(conversation.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed";
      setErr(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold text-white">Live Support Chat</h1>
          <p className="mt-1 text-[14px] text-slate-200/80">
            Chat with a support agent. Replies may take a few minutes.
          </p>
        </div>

        <Link
          href="/app/help"
          className="rounded-[14px] border border-slate-200/30 px-4 py-2 text-[14px] text-white/90 hover:border-slate-200/60"
        >
          Back to Help
        </Link>
      </div>

      {err && (
        <div className="mt-4 rounded-[16px] border border-red-700/40 bg-red-500/10 p-4 text-[14px] text-red-200">
          {err}
        </div>
      )}

      <section className="mt-6 rounded-[20px] border border-slate-200/30 bg-transparent">
        {/* header row */}
        <div className="flex items-center justify-between border-b border-slate-200/15 px-5 py-4">
          <div className="text-[14px] font-semibold text-white/90">
            {conversation ? `Conversation: ${conversation.id.slice(0, 8)}…` : "Conversation"}
          </div>
          <div className="text-[12px] text-slate-200/60">
            Status:{" "}
            <span className={conversation?.status === "OPEN" ? "text-emerald-300" : "text-red-300"}>
              {conversation?.status || "—"}
            </span>
          </div>
        </div>

        {/* messages */}
        <div className="h-[520px] overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-[13px] text-slate-200/70">Loading chat…</div>
          ) : messages.length === 0 ? (
            <div className="text-[13px] text-slate-200/70">No messages yet.</div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => {
                const mine = m.sender === "USER";
                const system = m.sender === "SYSTEM";
                return (
                  <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={[
                        "max-w-[78%] rounded-[16px] border px-4 py-3",
                        system
                          ? "border-slate-200/15 bg-slate-900/10 text-white/75"
                          : mine
                          ? "border-emerald-500/30 bg-emerald-500/10 text-white"
                          : "border-slate-200/20 bg-slate-900/10 text-white",
                      ].join(" ")}
                    >
                      <div className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.body}</div>
                      <div className="mt-2 text-[11px] text-white/55">
                        {m.sender} • {fmtTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* composer */}
        <div className="border-t border-slate-200/15 px-5 py-4">
          <div className="flex gap-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message…"
              className="flex-1 rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-3 text-[14px] text-white outline-none focus:border-emerald-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) send();
                }
              }}
            />
            <button
              type="button"
              disabled={!canSend}
              onClick={send}
              className="rounded-[16px] bg-emerald-500 px-6 py-3 text-[14px] font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>

          <div className="mt-2 text-[12px] text-white/55">
            Tip: press Enter to send. Shift+Enter for new line.
          </div>
        </div>
      </section>
    </div>
  );
}
