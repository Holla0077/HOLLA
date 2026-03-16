"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SupportTopic =
  | "ACCOUNT"
  | "KYC"
  | "DEPOSITS"
  | "WITHDRAWALS"
  | "CRYPTO"
  | "SECURITY"
  | "BUG";

const SUPPORT_EMAIL = "support@holla.app";

function buildMailto(opts: {
  to: string;
  subject: string;
  body: string;
}) {
  const params = new URLSearchParams();
  params.set("subject", opts.subject);
  params.set("body", opts.body);
  return `mailto:${opts.to}?${params.toString()}`;
}

export default function HelpPage() {
  const [topic, setTopic] = useState<SupportTopic>("ACCOUNT");
  const [message, setMessage] = useState("");
  const [showChatModal, setShowChatModal] = useState(false);

  const topicLabel: Record<SupportTopic, string> = {
    ACCOUNT: "Account",
    KYC: "Verification (KYC)",
    DEPOSITS: "Top Up / Deposits",
    WITHDRAWALS: "Withdrawals",
    CRYPTO: "Crypto",
    SECURITY: "Security",
    BUG: "Report a bug",
  };

  const emailSubject = useMemo(() => {
    return `HOLLA Support — ${topicLabel[topic]}`;
  }, [topic]);

  const emailBody = useMemo(() => {
    const lines = [
      `Topic: ${topicLabel[topic]}`,
      "",
      "Describe your issue:",
      message?.trim() ? message.trim() : "(write here)",
      "",
      "Helpful details (optional):",
      "- Username:",
      "- Email:",
      "- Phone:",
      "- Wallet (GHS/BTC/ETH/etc):",
      "- Transaction ID (if any):",
      "- Screenshot (attach if possible):",
      "",
      "Sent from HOLLA web app.",
    ];
    return lines.join("\n");
  }, [topic, message]);

  const mailtoHref = useMemo(() => {
    return buildMailto({
      to: SUPPORT_EMAIL,
      subject: emailSubject,
      body: emailBody,
    });
  }, [emailSubject, emailBody]);

  return (
    <div className="max-w-[1100px]">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-white">Help</h1>
        <p className="mt-1 text-[14px] text-slate-200/80">
          Get support by email, or chat with a live agent.
        </p>
      </div>

      {/* Main grid */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left: options */}
        <div className="rounded-[20px] border border-slate-200/30 bg-transparent p-5">
          <div className="text-[16px] font-semibold text-white">Contact options</div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Email card */}
            <div className="rounded-[18px] border border-slate-200/25 bg-slate-900/10 p-5">
              <div className="text-[14px] font-semibold text-white/90">Email Support</div>
              <div className="mt-1 text-[13px] text-white/70">
                Send an email to our support team. You can attach screenshots.
              </div>

              <a
                href={mailtoHref}
                className="mt-4 inline-flex w-full items-center justify-center rounded-[16px] bg-emerald-500 px-5 py-3 text-[14px] font-semibold text-black hover:bg-emerald-600"
              >
                Send Email
              </a>

              <div className="mt-3 text-[12px] text-white/60">
                Email: <span className="text-white/80">{SUPPORT_EMAIL}</span>
              </div>
            </div>

            {/* Live chat card */}
            <div className="rounded-[18px] border border-slate-200/25 bg-slate-900/10 p-5">
              <div className="text-[14px] font-semibold text-white/90">Live Agent Chat</div>
              <div className="mt-1 text-[13px] text-white/70">
                Chat with a support agent (coming soon / or connect to provider).
              </div>

              <Link
  href="/app/help/chat"
  className="mt-4 w-full inline-flex items-center justify-center rounded-[16px] border border-slate-200/50 bg-transparent px-5 py-3 text-[14px] font-semibold text-white/90 hover:border-emerald-400 hover:text-emerald-200"
>
  Chat with Live Agent
</Link>
              <div className="mt-3 text-[12px] text-white/60">
                Tip: use Email for urgent proof/screenshots.
              </div>
            </div>
          </div>

          {/* Support form (used for email body) */}
          <div className="mt-6 rounded-[18px] border border-slate-200/25 p-5">
            <div className="text-[14px] font-semibold text-white/90">Quick support message</div>
            <div className="mt-1 text-[12px] text-white/65">
              This message will be included in the email if you click “Send Email”.
            </div>

            {/* Topic selector */}
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(Object.keys(topicLabel) as SupportTopic[]).map((t) => {
                const active = topic === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    className={[
                      "rounded-[14px] border px-3 py-2 text-[13px] font-semibold transition-colors",
                      active
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-200/20 text-white/80 hover:border-slate-200/45",
                    ].join(" ")}
                  >
                    {topicLabel[t]}
                  </button>
                );
              })}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your issue here…"
              className="mt-4 min-h-[120px] w-full rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-3 text-[14px] text-white outline-none focus:border-emerald-400"
            />

            <div className="mt-3 text-[12px] text-white/60">
              Keep it short: what happened + what you expected + any transaction ID.
            </div>
          </div>
        </div>

        {/* Right: guidance */}
        <div className="rounded-[20px] border border-slate-200/30 bg-transparent p-5">
          <div className="text-[16px] font-semibold text-white">Support tips</div>

          <div className="mt-4 space-y-3 text-[13px] text-white/75">
            <div className="rounded-[14px] border border-slate-200/20 bg-slate-900/10 p-4">
              <div className="font-semibold text-white/90">Transaction issues</div>
              <div className="mt-1">
                Include the transaction ID from Activity, plus the wallet (BTC/ETH/GHS).
              </div>
            </div>

            <div className="rounded-[14px] border border-slate-200/20 bg-slate-900/10 p-4">
              <div className="font-semibold text-white/90">Verification (KYC)</div>
              <div className="mt-1">
                Use clear photos, matching names, and correct date of birth.
              </div>
            </div>

            <div className="rounded-[14px] border border-slate-200/20 bg-slate-900/10 p-4">
              <div className="font-semibold text-white/90">Security</div>
              <div className="mt-1">
                If you suspect account compromise, change password immediately and contact support.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Chat modal (placeholder) */}
      {showChatModal && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close"
            onClick={() => setShowChatModal(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-slate-200/20 bg-[#070B1A] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[12px] text-slate-200/70">Live Agent</div>
                <div className="mt-1 text-[18px] font-semibold text-white">
                  Chat is coming soon
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="rounded-[14px] border border-slate-200/20 bg-slate-900/10 px-4 py-2 text-[13px] text-white/90 hover:border-slate-200/45"
              >
                Close
              </button>
            </div>

            <div className="mt-4 text-[13px] text-white/75">
              Next step: we can connect a real live chat provider (example: Crisp, Intercom, Tawk.to)
              or build an internal chat page using our database.
            </div>

            <div className="mt-5 flex gap-2">
              <a
                href={mailtoHref}
                className="flex-1 rounded-[16px] bg-emerald-500 px-5 py-3 text-center text-[14px] font-semibold text-black hover:bg-emerald-600"
              >
                Use Email Instead
              </a>
              <button
                onClick={() => setShowChatModal(false)}
                className="flex-1 rounded-[16px] border border-slate-200/30 bg-transparent px-5 py-3 text-[14px] font-semibold text-white/90 hover:border-slate-200/50"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}