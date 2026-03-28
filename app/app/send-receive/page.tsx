"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WalletCard, formatWalletBalance, walletCardGlass } from "@/app/app/_components/WalletCard";

type UiWallet = {
  id: string;
  assetId: string;
  code: string;
  name: string;
  type: "FIAT" | "CRYPTO";
  balance: string;
};

type Tab = "SEND" | "RECEIVE";

type MeUser = {
  username?: string | null;
  email?: string | null;
  phone?: string | null;
};

function isFiat(code: string) { return code === "GHS"; }
function isBtc(code: string) { return code === "BTC"; }

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong";
}

export default function SendReceivePage() {
  const sp = useSearchParams();
  const mode = (sp.get("mode") || "cash").toLowerCase() === "crypto" ? "crypto" : "cash";

  const [wallets, setWallets] = useState<UiWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => wallets.find((w) => w.id === selectedId) ?? null, [wallets, selectedId]);

  const [tab, setTab] = useState<Tab>("SEND");

  // SEND form
  const [sendTo, setSendTo] = useState("");
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);

  // RECEIVE
  const [copied, setCopied] = useState(false);
  const [meUser, setMeUser] = useState<MeUser | null>(null);

  // BTC deposit address state
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [btcAddrLoading, setBtcAddrLoading] = useState(false);
  const [btcAddrError, setBtcAddrError] = useState<string | null>(null);
  const [btcSyncing, setBtcSyncing] = useState(false);
  const [btcSyncMsg, setBtcSyncMsg] = useState<string | null>(null);
  const [btcSyncOk, setBtcSyncOk] = useState(false);

  // Load me
  useEffect(() => {
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(d => { if (d?.user) setMeUser(d.user); }).catch(() => {});
  }, []);

  // Load wallets
  const loadWallets = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch("/api/wallets");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load wallets");
      const list: UiWallet[] = Array.isArray(data.wallets) ? data.wallets : [];
      const visible = mode === "cash"
        ? list.filter(w => w.type === "FIAT" || w.code === "GHS")
        : list.filter(w => w.type === "CRYPTO" && w.code !== "GHS");
      setWallets(visible);
      setSelectedId(prev => prev ?? visible?.[0]?.id ?? null);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [mode]);

  useEffect(() => { loadWallets(); }, [loadWallets]);

  // Fetch BTC address when switching to BTC + RECEIVE tab
  useEffect(() => {
    if (tab === "RECEIVE" && selected && isBtc(selected.code) && !btcAddress && !btcAddrLoading) {
      setBtcAddrLoading(true);
      setBtcAddrError(null);
      fetch("/api/crypto/btc/address")
        .then(r => r.json())
        .then(d => {
          if (d.error) throw new Error(d.error);
          setBtcAddress(d.address);
        })
        .catch(e => setBtcAddrError(getErrorMessage(e)))
        .finally(() => setBtcAddrLoading(false));
    }
  }, [tab, selected, btcAddress, btcAddrLoading]);

  function resetSendMessages() { setSendError(null); setSendOk(null); }

  async function handleCopy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /**/ }
  }

  async function submitSend() {
    if (!selected) return;
    resetSendMessages();

    if (!sendAmount || Number(sendAmount) <= 0) { setSendError("Enter a valid amount."); return; }

    if (isFiat(selected.code)) {
      if (!sendTo.trim()) { setSendError("Enter username, email, or phone."); return; }
    } else {
      if (!sendAddress.trim()) { setSendError("Enter a wallet address."); return; }
    }

    setSendBusy(true);
    try {
      if (isFiat(selected.code)) {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientIdentifier: sendTo.trim(), assetCode: selected.code, amount: sendAmount }),
        });
        const data = await res.json();
        if (!res.ok) { setSendError(data?.error || "Send failed"); return; }
        setSendOk(`Sent successfully! Transaction ID: ${data.transactionId}`);
        setSendAmount(""); setSendTo("");
        await loadWallets();
      } else {
        // On-chain BTC send — requires signing infrastructure; show clear message
        setSendError(
          "On-chain BTC sends are not yet live. To send BTC, withdraw from your wallet using the blockchain sweep feature coming soon."
        );
      }
    } catch (e) { setSendError(getErrorMessage(e)); }
    finally { setSendBusy(false); }
  }

  async function syncBtcDeposits() {
    setBtcSyncing(true); setBtcSyncMsg(null); setBtcSyncOk(false);
    try {
      const r = await fetch("/api/crypto/btc/sync-deposits", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Sync failed");
      const credited = (d.deposits ?? []).filter((dep: { status: string }) => dep.status === "CREDITED").length;
      const pending  = (d.deposits ?? []).filter((dep: { status: string }) => dep.status === "PENDING").length;
      if (credited > 0) {
        setBtcSyncOk(true);
        setBtcSyncMsg(`✓ ${credited} deposit${credited > 1 ? "s" : ""} credited to your wallet!`);
        await loadWallets();
      } else if (pending > 0) {
        setBtcSyncMsg(`${pending} deposit${pending > 1 ? "s" : ""} found — waiting for confirmation (~10 min).`);
      } else {
        setBtcSyncMsg("No deposits detected yet. Transactions may take a few minutes to appear on-chain.");
      }
    } catch (e) { setBtcSyncMsg(getErrorMessage(e)); }
    finally { setBtcSyncing(false); }
  }

  const userDetails = useMemo(() => ({
    username: meUser?.username || "—",
    email: meUser?.email || "—",
    phone: meUser?.phone || "—",
  }), [meUser]);

  const receiveLink = useMemo(() => {
    if (!selected || !isFiat(selected.code)) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "https://kashboy.com";
    return `${base}/pay?to=${encodeURIComponent(userDetails.username)}&asset=${encodeURIComponent(selected.code)}`;
  }, [selected, userDetails.username]);

  return (
    <div className="max-w-[1100px]">
      {/* header */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold text-white">Send / Receive</h1>
          <p className="mt-1 text-[14px] text-slate-200/80">Select a wallet, then send or receive.</p>
        </div>
        <Link href={`/app/home?mode=${mode}`} className="rounded-[14px] border border-slate-200/30 px-4 py-2 text-[14px] text-white/90 hover:border-slate-200/60">
          Back to Summary
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-[16px] border border-red-700/40 bg-red-500/10 p-4 text-[14px] text-red-200">{error}</div>
      )}

      {/* Wallet selector */}
      <section className={`mt-6 p-4 ${walletCardGlass}`}>
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-semibold text-white/90">Select wallet</div>
          <div className="text-[12px] text-slate-200/60">{mode.toUpperCase()}</div>
        </div>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {loading ? (
            <div className="text-[13px] text-slate-200/70">Loading wallets…</div>
          ) : wallets.length === 0 ? (
            <div className="text-[13px] text-slate-200/70">No wallets found.</div>
          ) : wallets.map(w => (
            <WalletCard
              key={w.id}
              name={w.name}
              code={w.code}
              formattedBalance={formatWalletBalance(w.code, w.balance)}
              active={w.id === selectedId}
              onClick={() => { setSelectedId(w.id); resetSendMessages(); setCopied(false); setBtcSyncMsg(null); }}
            />
          ))}
        </div>
      </section>

      {/* SEND / RECEIVE tabs */}
      <div className="mt-6 flex items-center gap-2">
        {(["SEND", "RECEIVE"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); resetSendMessages(); setCopied(false); setBtcSyncMsg(null); }}
            className={[
              "rounded-[14px] border px-6 py-2 text-[14px] font-semibold transition-colors",
              tab === t
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                : "border-slate-200/25 text-white/80 hover:border-slate-200/45",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Main panels */}
      <section className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        {/* Left — action panel */}
        <div className="rounded-[22px] border border-slate-200/40 bg-transparent p-5">
          {!selected ? (
            <div className="text-[14px] text-slate-200/70">Select a wallet to continue.</div>
          ) : tab === "SEND" ? (
            /* ─── SEND ─────────────────────────────────────── */
            <>
              <div className="text-[13px] text-slate-200/70">Sending from</div>
              <div className="mt-1 text-[18px] font-semibold text-white">
                {selected.name} <span className="text-emerald-400">· {selected.code}</span>
              </div>

              <div className="mt-5 space-y-3">
                {isFiat(selected.code) ? (
                  <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
                    <div className="text-[13px] font-semibold text-white/90">Send to</div>
                    <div className="mt-1 text-[12px] text-white/60">Username, email, or phone — internal transfer</div>
                    <input
                      value={sendTo}
                      onChange={e => setSendTo(e.target.value)}
                      placeholder="username / email / +233..."
                      className="mt-3 w-full rounded-[12px] border border-slate-200/20 bg-slate-900/10 px-3 py-2 text-[14px] text-white outline-none focus:border-emerald-400"
                    />
                  </div>
                ) : (
                  <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
                    <div className="text-[13px] font-semibold text-white/90">Destination address</div>
                    <div className="mt-1 text-[12px] text-white/60">Paste the recipient&apos;s {selected.code} wallet address</div>
                    <input
                      value={sendAddress}
                      onChange={e => setSendAddress(e.target.value)}
                      placeholder={`${selected.code} address`}
                      className="mt-3 w-full rounded-[12px] border border-slate-200/20 bg-slate-900/10 px-3 py-2 font-mono text-[13px] text-white outline-none focus:border-emerald-400"
                    />
                  </div>
                )}

                <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
                  <div className="text-[13px] font-semibold text-white/90">Amount</div>
                  <div className="mt-1 text-[12px] text-white/60">
                    Balance: {formatWalletBalance(selected.code, selected.balance)} {selected.code}
                  </div>
                  <input
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    type="number"
                    min="0"
                    step={isFiat(selected.code) ? "1" : "0.00000001"}
                    placeholder={isFiat(selected.code) ? "e.g. 50" : "e.g. 0.001"}
                    className="mt-3 w-full rounded-[12px] border border-slate-200/20 bg-slate-900/10 px-3 py-2 text-[14px] text-white outline-none focus:border-emerald-400"
                  />
                </div>

                {sendError && (
                  <div className="rounded-[14px] border border-red-700/40 bg-red-500/10 p-3 text-[13px] text-red-200">{sendError}</div>
                )}
                {sendOk && (
                  <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 p-3 text-[13px] text-emerald-200">{sendOk}</div>
                )}

                <button
                  type="button"
                  disabled={sendBusy || !selected}
                  onClick={submitSend}
                  className="w-full rounded-[16px] bg-emerald-500 px-6 py-3 text-[16px] font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
                >
                  {sendBusy ? "Sending…" : `SEND ${selected.code}`}
                </button>
              </div>
            </>
          ) : (
            /* ─── RECEIVE ──────────────────────────────────── */
            <>
              <div className="text-[13px] text-slate-200/70">Receiving into</div>
              <div className="mt-1 text-[18px] font-semibold text-white">
                {selected.name} <span className="text-emerald-400">· {selected.code}</span>
              </div>

              <div className="mt-5 space-y-4">
                {isFiat(selected.code) ? (
                  /* ── GHS receive ── */
                  <>
                    <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
                      <div className="text-[13px] font-semibold text-white/90">Your KashBoy details</div>
                      <div className="mt-1 text-[12px] text-white/60">Share any of these so others can send you GHS</div>
                      <div className="mt-3 space-y-2 text-[13px]">
                        {[["Username", userDetails.username], ["Email", userDetails.email], ["Phone", userDetails.phone]].map(([label, val]) => (
                          <div key={label} className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">{label}</span>
                            <button type="button" onClick={() => handleCopy(val)} className="font-semibold text-white hover:text-emerald-300">{val}</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
                      <div className="text-[13px] font-semibold text-white/90">Payment link</div>
                      <div className="mt-2 break-all font-mono text-[12px] text-slate-300">{receiveLink || "—"}</div>
                      <button
                        type="button"
                        onClick={() => handleCopy(receiveLink)}
                        disabled={!receiveLink}
                        className="mt-3 rounded-[12px] bg-emerald-500 px-5 py-2 text-[13px] font-semibold text-black hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {copied ? "✓ Copied!" : "Copy Link"}
                      </button>
                    </div>

                    <div className="rounded-[16px] border border-yellow-600/20 bg-yellow-500/5 p-3 text-[12px] text-yellow-200/80">
                      To fund your GHS wallet via MoMo or card, go to <strong>Summary → Fund Wallet</strong>.
                    </div>
                  </>
                ) : isBtc(selected.code) ? (
                  /* ── BTC receive ── */
                  <>
                    {btcAddrLoading && (
                      <div className="flex items-center gap-3 rounded-[16px] border border-slate-700 bg-slate-900/30 p-4 text-[13px] text-slate-300">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                        Generating your Bitcoin address…
                      </div>
                    )}
                    {btcAddrError && (
                      <div className="rounded-[16px] border border-red-700/40 bg-red-500/10 p-4 text-[13px] text-red-300">{btcAddrError}</div>
                    )}

                    {btcAddress && !btcAddrLoading && (
                      <>
                        {/* QR + address */}
                        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                          <div className="flex items-center justify-center rounded-[16px] border border-slate-700 bg-white p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(btcAddress)}`}
                              alt="BTC Deposit QR"
                              className="h-[168px] w-[168px] rounded-[8px]"
                            />
                          </div>

                          <div className="rounded-[16px] border border-slate-700 bg-slate-900/30 p-4">
                            <div className="text-[12px] text-slate-400">Your BTC deposit address</div>
                            <div className="mt-2 break-all font-mono text-[13px] leading-relaxed text-emerald-300">
                              {btcAddress}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(btcAddress)}
                              className="mt-3 w-full rounded-[12px] border border-emerald-500/40 bg-emerald-500/10 py-2 text-[13px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                            >
                              {copied ? "✓ Copied!" : "Copy Address"}
                            </button>
                          </div>
                        </div>

                        {/* Instructions */}
                        <div className="rounded-[16px] border border-slate-700 bg-slate-900/20 p-4 text-[12px] text-slate-400 space-y-1.5">
                          <div className="text-[13px] font-semibold text-slate-200 mb-2">How to receive BTC</div>
                          <div>1. Copy the address above and paste it in your sending app or exchange.</div>
                          <div>2. Send any amount of BTC to this address.</div>
                          <div>3. Click <strong className="text-slate-200">Check for Deposits</strong> below once sent.</div>
                          <div>4. After <strong className="text-slate-200">1 confirmation</strong> (~10 min), your balance updates automatically.</div>
                        </div>

                        {/* Sync button */}
                        <button
                          type="button"
                          disabled={btcSyncing}
                          onClick={syncBtcDeposits}
                          className="w-full rounded-[16px] bg-emerald-500 px-6 py-3 text-[15px] font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
                        >
                          {btcSyncing ? "Checking blockchain…" : "Check for Deposits"}
                        </button>

                        {btcSyncMsg && (
                          <div className={`rounded-[14px] border p-3 text-[13px] ${btcSyncOk ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-900/30 text-slate-300"}`}>
                            {btcSyncMsg}
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  /* ── Other crypto receive (placeholder) ── */
                  <div className="rounded-[16px] border border-slate-700 bg-slate-900/20 p-4">
                    <div className="text-[13px] font-semibold text-white/90">Deposit address</div>
                    <div className="mt-2 text-[13px] text-slate-400">
                      {selected.code} deposit addresses are coming soon. Currently only BTC deposits are supported via the blockchain.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right — guide */}
        <div className="rounded-[22px] border border-slate-200/40 bg-transparent p-5">
          <div className="text-[16px] font-semibold text-white">Quick Guide</div>
          <div className="mt-3 space-y-3 text-[13px] text-white/75">
            <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
              <div className="font-semibold text-white/90">Send GHS (Cash)</div>
              <div className="mt-1">Enter a KashBoy username, email, or phone number. Transfers are instant and free between KashBoy wallets.</div>
            </div>
            <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
              <div className="font-semibold text-white/90">Receive Bitcoin</div>
              <div className="mt-1">Switch to the Receive tab and copy your unique BTC address. Each account has one permanent address. After sending, click <strong className="text-white">Check for Deposits</strong>.</div>
            </div>
            <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
              <div className="font-semibold text-white/90">Fund GHS Wallet</div>
              <div className="mt-1">Go to <span className="text-emerald-300">Summary → Fund Wallet</span> to top up with MTN MoMo or a Visa card.</div>
            </div>
            <div className="rounded-[16px] border border-slate-200/20 bg-slate-900/10 px-4 py-4">
              <div className="font-semibold text-white/90">Network Fees</div>
              <div className="mt-1">KashBoy-to-KashBoy transfers are free. Bitcoin on-chain transactions carry a network miner fee.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
