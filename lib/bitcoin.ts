/**
 * Bitcoin HD wallet utilities using BIP32/BIP44.
 *
 * Master seed: stored as BTC_MASTER_SEED env var (hex-encoded 64-byte seed).
 * If missing, it is generated once and must be persisted immediately.
 *
 * Derivation: m/44'/0'/0'/0/{index}  (mainnet)
 *             m/44'/1'/0'/0/{index}  (testnet when BTC_NETWORK=testnet)
 *
 * Deposit detection: Blockstream.info REST API (free, no key needed).
 */

import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as ecc from "@bitcoinerlab/secp256k1";
import crypto from "crypto";

// Wire secp256k1 implementation into BIP32
const bip32 = BIP32Factory(ecc);

// ────────────────────────────────────────────────────────────────────────────
// Network helpers
// ────────────────────────────────────────────────────────────────────────────
function network(): bitcoin.Network {
  return process.env.BTC_NETWORK === "testnet"
    ? bitcoin.networks.testnet
    : bitcoin.networks.bitcoin;
}

function blockstreamBase(): string {
  const primary = process.env.BTC_NETWORK === "testnet"
    ? "https://blockstream.info/testnet/api"
    : "https://blockstream.info/api";
  
  // Fallback to mempool.space if Blockstream rate limits
  const fallback = process.env.BTC_NETWORK === "testnet"
    ? "https://mempool.space/testnet/api"
    : "https://mempool.space/api";
  
  // You can add a simple toggle by env var if needed
  return process.env.USE_FALLBACK_BTC_API === "true" ? fallback : primary;
}

// ────────────────────────────────────────────────────────────────────────────
// Seed / master key
// ────────────────────────────────────────────────────────────────────────────
function getMasterSeed(): Buffer {
  const seedHex = process.env.BTC_MASTER_SEED;
  if (!seedHex) {
    throw new Error(
      "BTC_MASTER_SEED env var is not set. " +
        "Generate one with: node -e \"require('crypto').randomBytes(64).toString('hex')\" " +
        "and save it as BTC_MASTER_SEED in your environment secrets."
    );
  }
  return Buffer.from(seedHex, "hex");
}

// ────────────────────────────────────────────────────────────────────────────
// Address derivation
// ────────────────────────────────────────────────────────────────────────────
/**
 * Derives a BIP44 P2PKH Bitcoin address for a given HD index.
 * Path: m/44'/0'/0'/0/{index}  (mainnet)  or  m/44'/1'/0'/0/{index}  (testnet)
 */
export function deriveBitcoinAddress(hdIndex: number): string {
  const net = network();
  const coinType = net === bitcoin.networks.testnet ? 1 : 0;
  const seed = getMasterSeed();
  const root = bip32.fromSeed(seed, net);
  const child = root.derivePath(`m/44'/${coinType}'/0'/0/${hdIndex}`);
  const { address } = bitcoin.payments.p2pkh({
    pubkey: Buffer.from(child.publicKey),
    network: net,
  });
  if (!address) throw new Error("Failed to derive Bitcoin address");
  return address;
}

/**
 * Generates a fresh random hex seed. Call once during initial setup.
 * Print it and store as BTC_MASTER_SEED.
 */
export function generateMasterSeedHex(): string {
  return crypto.randomBytes(64).toString("hex");
}

// ────────────────────────────────────────────────────────────────────────────
// Blockstream API helpers
// ────────────────────────────────────────────────────────────────────────────

export interface UtxoEntry {
  txid: string;
  vout: number;
  value: number; // satoshis
  status: {
    confirmed: boolean;
    block_height?: number;
  };
}

export interface TxStatus {
  confirmed: boolean;
  block_height?: number;
}

/** Fetch all UTXOs (unspent outputs) for a Bitcoin address. */
export async function fetchAddressUtxos(address: string): Promise<UtxoEntry[]> {
  const base = blockstreamBase();
  let lastError: Error | null = null;
  
  for (const apiBase of [base, base.includes("blockstream") ? base.replace("blockstream.info", "mempool.space") : base]) {
    try {
      const url = `${apiBase}/address/${address}/utxo`;
      const res = await fetch(url, { next: { revalidate: 0 } } as RequestInit);
      if (res.status === 429) {
        // Rate limited, try fallback
        continue;
      }
      if (!res.ok) throw new Error(`UTXO fetch failed: ${res.status}`);
      return await res.json();
    } catch (e) {
      lastError = e as Error;
    }
  }
  throw lastError || new Error("All UTXO fetch attempts failed");
}

/** Get current confirmation count for a txid (0 if unconfirmed). */
export async function fetchTxConfirmations(txid: string): Promise<number> {
  const statusRes = await fetch(`${blockstreamBase()}/tx/${txid}/status`, {
    next: { revalidate: 0 },
  } as RequestInit);
  if (!statusRes.ok) return 0;
  const status: TxStatus = await statusRes.json();
  if (!status.confirmed) return 0;

  const heightRes = await fetch(`${blockstreamBase()}/blocks/tip/height`, {
    next: { revalidate: 0 },
  } as RequestInit);
  if (!heightRes.ok) return 1;
  const tip: number = await heightRes.json();
  return tip - (status.block_height ?? tip) + 1;
}

export const BTC_CONFIRMATIONS_REQUIRED = 1; // 1 confirmation for crediting
