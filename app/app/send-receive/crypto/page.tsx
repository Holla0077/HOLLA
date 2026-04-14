"use client";

import SendBtcForm from "@/app/app/components/wallet/SendBtcForm";
import { useEffect, useMemo, useState } from "react";

type UiWallet = {
  id: string;
  code: string;
  name: string;
  type: "FIAT" | "CRYPTO";
  balance: string;
};

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong";
}

function isBtc(code: string) {
  return code === "BTC";
}

export default function SendReceiveCryptoPage() {
  const [wallets, setWallets] = useState<UiWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const cryptoWallets = useMemo(
    () => wallets.filter((w) => w.type === "CRYPTO"),
    [wallets]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => cryptoWallets.find((w) => w.id === selectedId) ?? null,
    [cryptoWallets, selectedId]
  );

  // BTC address state
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [btcAddrLoading, setBtcAddrLoading] = useState(false);
  const [btcAddrError, setBtcAddrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/api/wallets");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load wallets");
        if (!alive) return;
        const list = Array.isArray(data.wallets) ? data.wallets : [];
        setWallets(list);
      } catch (e) {
        if (!alive) return;
        setErr(getErrorMessage(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!cryptoWallets.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !cryptoWallets.some((w) => w.id === selectedId)) {
      setSelectedId(cryptoWallets[0].id);
    }
  }, [loading, cryptoWallets, selectedId]);

  // Fetch BTC address when a BTC wallet is selected
  useEffect(() => {
    if (selected && isBtc(selected.code) && !btcAddress && !btcAddrLoading) {
      setBtcAddrLoading(true);
      setBtcAddrError(null);
      fetch("/api/crypto/btc/address")
        .then((r) => r.json())
        .then((d) => {
          if (d.error) throw new Error(d.error);
          setBtcAddress(d.address);
        })
        .catch((e) => setBtcAddrError(getErrorMessage(e)))
        .finally(() => setBtcAddrLoading(false));
    }
  }, [selected, btcAddress, btcAddrLoading]);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-slate-200/70">SEND / RECEIVE</div>
        <h1 className="mt-1 text-[22px] font-semibold text-white">Crypto</h1>
        <p className="mt-1 text-sm text-slate-200/80">
          Select a crypto wallet, then send to an address or show your receive address.
        </p>
      </div>

      {err && (
        <div className="rounded-[14px] border border-red-700/40 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* Wallet picker */}
      <div className="rounded-[18px] border border-slate-200/30 p-5">
        {loading ? (
          <div className="text-sm text-slate-300/80">Loading wallets…</div>
        ) : cryptoWallets.length === 0 ? (
          <div className="text-sm text-slate-300/80">
            No crypto wallets found. (Your backend should auto-create them after signup.)
          </div>
        ) : (
          <>
            <div className="text-sm font-semibold text-white">Select Wallet</div>

            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {cryptoWallets.map((w) => {
                const active = w.id === selectedId;
                return (
                  <button
                    key={w.id}
                    onClick={() => setSelectedId(w.id)}
                    className={[
                      "min-w-[220px] rounded-[14px] border px-4 py-3 text-left transition-colors",
                      active
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-200/25 hover:border-slate-200/50",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white/90">{w.name}</div>
                      <div className="rounded-full border border-slate-200/30 px-3 py-1 text-xs text-white/90">
                        {w.code}
                      </div>
                    </div>
                    <div className="mt-3 text-[18px] font-semibold text-emerald-400">
                      {w.balance} <span className="text-sm text-slate-200/70">{w.code}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            {selected && (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {/* SEND column */}
                <div className="rounded-[14px] border border-slate-200/25 p-4">
                  <div className="text-sm font-semibold text-white">Send Crypto</div>
                  <div className="mt-1 text-xs text-slate-200/70">To external address</div>

                  <div className="mt-3">
                    {isBtc(selected.code) ? (
                      <SendBtcForm />
                    ) : (
                      <div className="grid gap-2">
                        <input
                          className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                          placeholder="Destination address"
                        />
                        <input
                          className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                          placeholder={`Amount (e.g. 0.01 ${selected.code})`}
                        />
                        <button
                          type="button"
                          className="mt-1 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-600"
                          onClick={() => alert("Send functionality coming soon for this asset.")}
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* RECEIVE column */}
                <div className="rounded-[14px] border border-slate-200/25 p-4">
                  <div className="text-sm font-semibold text-white">Receive Crypto</div>
                  <div className="mt-1 text-xs text-slate-200/70">
                    {isBtc(selected.code)
                      ? "Your Bitcoin deposit address"
                      : "Wallet ID (address coming soon)"}
                  </div>

                  <div className="mt-3">
                    {isBtc(selected.code) ? (
                      <>
                        {btcAddrLoading && (
                          <div className="text-sm text-slate-400">Generating address…</div>
                        )}
                        {btcAddrError && (
                          <div className="text-sm text-red-400">{btcAddrError}</div>
                        )}
                        {btcAddress && !btcAddrLoading && (
                          <>
                            <div className="rounded-lg border border-slate-200/20 bg-slate-900/10 p-3">
                              <div className="break-all font-mono text-sm text-emerald-300">
                                {btcAddress}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="mt-3 w-full rounded-lg border border-slate-200/40 px-4 py-2 text-sm font-semibold text-white hover:border-slate-200/70"
                              onClick={() => handleCopy(btcAddress)}
                            >
                              {copied ? "✓ Copied!" : "Copy Address"}
                            </button>
                            <p className="mt-2 text-xs text-slate-400">
                              Send only BTC to this address. Transactions require 1 confirmation.
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="rounded-lg border border-slate-200/20 bg-slate-900/10 p-3 text-sm text-white/90">
                          Wallet ID: <span className="text-emerald-300">{selected.id}</span>
                        </div>
                        <button
                          type="button"
                          className="mt-3 w-full rounded-lg border border-slate-200/40 px-4 py-2 text-sm font-semibold text-white hover:border-slate-200/70"
                          onClick={async () => {
                            await navigator.clipboard.writeText(selected.id);
                            alert("Copied wallet id");
                          }}
                        >
                          Copy
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}