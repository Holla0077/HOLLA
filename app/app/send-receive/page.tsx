"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type UiWallet = {
  id: string;
  assetId: string;
  code: string;
  name: string;
  type: "FIAT" | "CRYPTO";
  balance: string; // BigInt string
};

function isFiat(code: string) {
  return code === "GHS";
}

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong";
}

/**
 * Placeholder receive addresses.
 * Later: fetch from /api/deposit-address?asset=BTC etc
 */
const RECEIVE_ADDRESS: Record<string, string> = {
  BTC: "bc1q_example_placeholder_address",
  ETH: "0x_example_placeholder_address",
  USDT_ERC20: "0x_example_placeholder_address",
  USDC_ERC20: "0x_example_placeholder_address",
  LTC: "ltc1q_example_placeholder_address",
  DASH: "Xx_example_placeholder_address",
  BCH: "bitcoincash:q_example_placeholder_address",
};

type Tab = "SEND" | "RECEIVE";

type MeUser = {
  username?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function SendReceivePage() {
  const sp = useSearchParams();
  const mode = (sp.get("mode") || "cash").toLowerCase() === "crypto" ? "crypto" : "cash";

  const [wallets, setWallets] = useState<UiWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => wallets.find((w) => w.id === selectedId) ?? null,
    [wallets, selectedId]
  );

  const [tab, setTab] = useState<Tab>("SEND");

  // SEND form
  const [sendTo, setSendTo] = useState("");
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);

  // Receive copy feedback
  const [copied, setCopied] = useState(false);

  // Real user data for receive section
  const [meUser, setMeUser] = useState<MeUser | null>(null);

  // Load real user data for the Receive panel
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.user) setMeUser(d.user as MeUser); })
      .catch(() => {});
  }, []);

  // Load wallets
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/wallets");
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Server did not return JSON. Status=${res.status}. Body: ${text.slice(0, 120)}`
          );
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load wallets");

        if (!alive) return;

        const list: UiWallet[] = Array.isArray(data.wallets) ? data.wallets : [];

        const visible =
          mode === "cash"
            ? list.filter((w) => w.type === "FIAT" || w.code === "GHS")
            : list.filter((w) => w.type === "CRYPTO" && w.code !== "GHS");

        setWallets(visible);
        setSelectedId((prev) => prev ?? visible?.[0]?.id ?? null);
      } catch (e: unknown) {
        if (!alive) return;
        setError(getErrorMessage(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [mode]);

  function resetSendMessages() {
    setSendError(null);
    setSendOk(null);
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  async function submitSend() {
    if (!selected) return;

    resetSendMessages();

    if (!sendAmount || Number(sendAmount) <= 0) {
      setSendError("Enter a valid amount.");
      return;
    }

    if (isFiat(selected.code)) {
      if (!sendTo.trim()) {
        setSendError("Enter username, email, or phone.");
        return;
      }
    } else {
      if (!sendAddress.trim()) {
        setSendError("Enter a wallet address.");
        return;
      }
    }

    setSendBusy(true);
    try {
      let res: Response;
      if (isFiat(selected.code)) {
        // GHS: Holla-to-Holla internal transfer
        res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientIdentifier: sendTo.trim(),
            assetCode: selected.code,
            amount: sendAmount,
          }),
        });
      } else {
        // Crypto: external chain send (not yet live — show clear message)
        setSendError("On-chain crypto sends are not yet available. Contact support for assistance.");
        setSendBusy(false);
        return;
      }

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };

      if (!res.ok) {
        setSendError(data?.error || "Send failed");
        return;
      }

      setSendOk(`Sent successfully. Transaction ID: ${data.transactionId}`);
      setSendAmount("");
      setSendTo("");
      setSendAddress("");
      // Refresh wallet balances
      const wr = await fetch("/api/wallets");
      const wd = await wr.json();
      if (Array.isArray(wd.wallets)) {
        const visible =
          mode === "cash"
            ? wd.wallets.filter((w: UiWallet) => w.type === "FIAT" || w.code === "GHS")
            : wd.wallets.filter((w: UiWallet) => w.type === "CRYPTO" && w.code !== "GHS");
        setWallets(visible);
      }
    } catch (e: unknown) {
      setSendError(getErrorMessage(e));
    } finally {
      setSendBusy(false);
    }
  }

  /**
   * RECEIVE values:
   * - For CASH (GHS): show "payment link" + username/email/phone
   * - For CRYPTO: show address + payment link + username/email/phone
   *
   * NOTE: Replace username/email/phone with real values once you add /api/me endpoint.
   */
  const userDetails = useMemo(() => {
    return {
      username: meUser?.username || "—",
      email: meUser?.email || "—",
      phone: meUser?.phone || "—",
    };
  }, [meUser]);

  const receiveAddress = useMemo(() => {
    if (!selected) return "";
    if (isFiat(selected.code)) return ""; // fiat has no chain address
    return RECEIVE_ADDRESS[selected.code] || "";
  }, [selected]);

  const receiveLink = useMemo(() => {
    if (!selected) return "";
    // placeholder link shape; later make this a real route you control (e.g. /pay?to=username&asset=GHS)
    const base = typeof window !== "undefined" ? window.location.origin : "https://example.com";
    const asset = encodeURIComponent(selected.code);
    const to = encodeURIComponent(userDetails.username);
    return `${base}/pay?to=${to}&asset=${asset}`;
  }, [selected, userDetails.username]);

  const qrValue = useMemo(() => {
    if (!selected) return "";
    // QR should always encode a link (best practice)
    return receiveLink || "";
  }, [selected, receiveLink]);

  const qrImgSrc = useMemo(() => {
    if (!qrValue) return "";
    // No dependencies; uses a simple QR image generator.
    // Works in local dev as long as the browser can reach the internet.
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrValue)}`;
  }, [qrValue]);

  return (
    <div className="max-w-[1100px]">
      {/* page header */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold text-white">Send / Receive</h1>
          <p className="mt-1 text-[14px] text-slate-200/80">
            Select a wallet, then send or receive.
          </p>
        </div>

        <Link
          href={`/app/home?mode=${mode}`}
          className="rounded-[14px] border border-slate-200/30 px-4 py-2 text-[14px] text-white/90 hover:border-slate-200/60"
        >
          Back to Summary
        </Link>
      </div>

      {/* errors */}
      {error && (
        <div className="mt-6 rounded-[16px] border border-red-700/40 bg-red-500/10 p-4 text-[14px] text-red-200">
          {error}
        </div>
      )}

      {/* Wallet selector row */}
      <section className="mt-6 rounded-[18px] border border-slate-200/30 bg-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-semibold text-white/90">Select wallet</div>
          <div className="text-[12px] text-slate-200/60">{mode.toUpperCase()}</div>
        </div>

        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {loading ? (
            <div className="text-[13px] text-slate-200/70">Loading wallets…</div>
          ) : wallets.length === 0 ? (
            <div className="text-[13px] text-slate-200/70">No wallets found.</div>
          ) : (
            wallets.map((w) => {
              const active = w.id === selectedId;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    setSelectedId(w.id);
                    resetSendMessages();
                    setCopied(false);
                  }}
                  className={[
                    "min-w-[220px] rounded-[16px] border px-4 py-3 text-left transition-colors",
                    active
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-200/25 hover:border-slate-200/45",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-semibold text-white/90">{w.name}</div>
                    <div className="rounded-full border border-slate-200/35 px-2 py-0.5 text-[12px] text-white/90">
                      {w.code}
                    </div>
                  </div>
                  <div className="mt-3 text-[22px] font-semibold text-white leading-none">{w.balance}</div>
                  <div className="mt-1 text-[12px] text-white/70">Available</div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* tabs */}
      <div className="mt-6 flex items-center gap-2">
        {(["SEND", "RECEIVE"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                resetSendMessages();
                setCopied(false);
              }}
              className={[
                "rounded-[14px] border px-5 py-2 text-[14px] font-semibold transition-colors",
                active
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-200/25 text-white/80 hover:border-slate-200/45",
              ].join(" ")}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* content panels */}
      <section className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        {/* left: main panel */}
        <div className="rounded-[20px] border border-slate-200/30 bg-transparent p-5">
          {!selected ? (
            <div className="text-[14px] text-slate-200/70">Select a wallet to continue.</div>
          ) : tab === "SEND" ? (
            <>
              <div className="text-[13px] text-slate-200/70">Sending from</div>
              <div className="mt-1 text-[18px] font-semibold text-white">
                {selected.name} <span className="text-emerald-400">* {selected.code}</span>
              </div>

              <div className="mt-5 space-y-3">
                {isFiat(selected.code) ? (
                  <div className="rounded-[16px] border border-slate-200/25 p-4">
                    <div className="text-[13px] font-semibold text-white/90">Send to</div>
                    <div className="mt-1 text-[12px] text-white/70">
                      Username, email, or phone (internal transfer)
                    </div>
                    <input
                      value={sendTo}
                      onChange={(e) => setSendTo(e.target.value)}
                      placeholder="username / email / +233..."
                      className="mt-3 w-full rounded-[12px] border border-slate-200/20 bg-slate-900/10 px-3 py-2 text-[14px] text-white outline-none focus:border-emerald-400"
                    />
                  </div>
                ) : (
                  <div className="rounded-[16px] border border-slate-200/25 p-4">
                    <div className="text-[13px] font-semibold text-white/90">Wallet address</div>
                    <div className="mt-1 text-[12px] text-white/70">External address (blockchain rail)</div>
                    <input
                      value={sendAddress}
                      onChange={(e) => setSendAddress(e.target.value)}
                      placeholder="Paste wallet address"
                      className="mt-3 w-full rounded-[12px] border border-slate-200/20 bg-slate-900/10 px-3 py-2 text-[14px] text-white outline-none focus:border-emerald-400"
                    />
                  </div>
                )}

                <div className="rounded-[16px] border border-slate-200/25 p-4">
                  <div className="text-[13px] font-semibold text-white/90">Amount</div>
                  <input
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder={isFiat(selected.code) ? "e.g. 50" : "e.g. 0.001"}
                    className="mt-3 w-full rounded-[12px] border border-slate-200/20 bg-slate-900/10 px-3 py-2 text-[14px] text-white outline-none focus:border-emerald-400"
                  />
                  <div className="mt-2 text-[12px] text-white/65">Insufficient balance will block send.</div>
                </div>

                {sendError && (
                  <div className="rounded-[14px] border border-red-700/40 bg-red-500/10 p-3 text-[13px] text-red-200">
                    {sendError}
                  </div>
                )}
                {sendOk && (
                  <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 p-3 text-[13px] text-emerald-200">
                    {sendOk}
                  </div>
                )}

                <button
                  type="button"
                  disabled={sendBusy || !selected}
                  onClick={submitSend}
                  className="w-full rounded-[16px] bg-emerald-500 px-6 py-3 text-center text-[16px] font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
                >
                  {sendBusy ? "Sending..." : "CONFIRM SEND"}
                </button>
              </div>
            </>
          ) : (
  <>
    <div className="text-[13px] text-slate-200/70">Receive into</div>
    <div className="mt-1 text-[18px] font-semibold text-white">
      {selected.name} <span className="text-emerald-400">* {selected.code}</span>
    </div>

    <div className="mt-5 rounded-[16px] border border-slate-200/25 p-4">
      {isFiat(selected.code) ? (
        <>
          {/* CASH RECEIVE (keep as-is if you want cash to show link + details) */}
          <div className="text-[13px] font-semibold text-white/90">Receiving link</div>
          <div className="mt-2 rounded-[12px] border border-slate-200/20 bg-slate-900/10 p-3">
            <div className="break-all text-[13px] text-white/90">{receiveLink || "—"}</div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(receiveLink)}
              className="rounded-[12px] bg-emerald-500 px-4 py-2 text-[13px] font-semibold text-black hover:bg-emerald-600"
              disabled={!receiveLink}
            >
              COPY LINK
            </button>
            {copied && <span className="text-[12px] text-emerald-200">Copied</span>}
          </div>

          <div className="mt-5 rounded-[14px] border border-slate-200/20 bg-slate-900/10 p-4">
            <div className="text-[13px] font-semibold text-white/90">Your receiving details</div>
            <div className="mt-3 space-y-2 text-[13px] text-white/80">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70">Username</span>
                <span className="font-semibold text-white">{userDetails.username}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70">Email</span>
                <span className="font-semibold text-white">{userDetails.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70">Phone</span>
                <span className="font-semibold text-white">{userDetails.phone}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* CRYPTO RECEIVE (ONLY address + QR) */}
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="rounded-[16px] border border-slate-200/25 p-4 flex items-center justify-center">
              {receiveAddress ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    receiveAddress
                  )}`}
                  alt="Wallet Address QR"
                  className="h-[220px] w-[220px] rounded-[12px] bg-white p-2"
                />
              ) : (
                <div className="text-[13px] text-white/70">QR will appear here.</div>
              )}
            </div>

            <div className="rounded-[16px] border border-slate-200/25 p-4">
              <div className="text-[13px] font-semibold text-white/90">Wallet address</div>
              <div className="mt-2 rounded-[12px] border border-slate-200/20 bg-slate-900/10 p-3">
                <div className="break-all text-[13px] text-white/90">
                  {receiveAddress || "Address will appear here (placeholder)"}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(receiveAddress)}
                  className="rounded-[12px] bg-emerald-500 px-4 py-2 text-[13px] font-semibold text-black hover:bg-emerald-600"
                  disabled={!receiveAddress}
                >
                  COPY ADDRESS
                </button>
                {copied && <span className="text-[12px] text-emerald-200">Copied</span>}
              </div>

              <div className="mt-3 text-[12px] text-white/65">
                Always use the correct network for{" "}
                <span className="text-emerald-200">{selected.code}</span>.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  </>
)}

        </div>

        {/* right: notes */}
        <div className="rounded-[20px] border border-slate-200/30 bg-transparent p-5">
          <div className="text-[16px] font-semibold text-white">Notes</div>

          <div className="mt-3 space-y-3 text-[13px] text-white/75">
            <div className="rounded-[14px] border border-slate-200/20 bg-slate-900/10 p-4">
              <div className="font-semibold text-white/90">Receive rules</div>
              <div className="mt-1">
                Receive only shows QR + link + your details. Top Up is handled on Summary via a modal.
              </div>
            </div>

            <div className="rounded-[14px] border border-slate-200/20 bg-slate-900/10 p-4">
              <div className="font-semibold text-white/90">Send rules</div>
              <div className="mt-1">
                Cash (GHS): internal transfers. Crypto: requires a destination address.
              </div>
            </div>

            <div className="rounded-[14px] border border-slate-200/20 bg-slate-900/10 p-4">
              <div className="font-semibold text-white/90">Next</div>
              <div className="mt-1">
                Add <span className="text-emerald-200">/api/me</span> so username/email/phone are real, and add{" "}
                <span className="text-emerald-200">/api/deposit-address</span> for crypto addresses.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}