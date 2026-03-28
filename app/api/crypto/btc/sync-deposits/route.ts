/**
 * POST /api/crypto/btc/sync-deposits
 * Polls Blockstream API for deposits on the user's BTC address,
 * records any new UTXOs, and credits the wallet once confirmed.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import {
  fetchAddressUtxos,
  fetchTxConfirmations,
  BTC_CONFIRMATIONS_REQUIRED,
} from "@/lib/bitcoin";
import { sendTransactionEmail } from "@/lib/email";

const MIN_CONFIRMATIONS = BTC_CONFIRMATIONS_REQUIRED;

export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cryptoAddr = await prisma.cryptoAddress.findUnique({
    where: { userId_coin: { userId: session.id, coin: "BTC" } },
  });
  if (!cryptoAddr) {
    return NextResponse.json({ deposits: [], message: "No BTC address found" });
  }

  let utxos;
  try {
    utxos = await fetchAddressUtxos(cryptoAddr.address);
  } catch (err) {
    console.error("[BTC sync]", err);
    return NextResponse.json({ error: "Failed to reach blockchain API" }, { status: 502 });
  }

  const results: Array<{ txid: string; vout: number; status: string; amountSat: number }> = [];

  for (const utxo of utxos) {
    const { txid, vout, value: amountSat, status: utxoStatus } = utxo;

    const existing = await prisma.cryptoDeposit.findUnique({
      where: { txid_vout: { txid, vout } },
    });

    if (existing?.status === "CREDITED") {
      results.push({ txid, vout, status: "CREDITED", amountSat });
      continue;
    }

    let confirmations = 0;
    if (utxoStatus.confirmed) {
      try { confirmations = await fetchTxConfirmations(txid); } catch { confirmations = 1; }
    }

    const depositStatus = confirmations >= MIN_CONFIRMATIONS ? "CONFIRMED" : "PENDING";

    if (!existing) {
      await prisma.cryptoDeposit.create({
        data: { addressId: cryptoAddr.id, txid, vout, amountSat: BigInt(amountSat), confirmations, status: depositStatus },
      });
    } else {
      await prisma.cryptoDeposit.update({ where: { id: existing.id }, data: { confirmations, status: depositStatus } });
    }

    if (depositStatus === "CONFIRMED") {
      const depositRecord = await prisma.cryptoDeposit.findUnique({ where: { txid_vout: { txid, vout } } });
      if (!depositRecord || depositRecord.status === "CREDITED") {
        results.push({ txid, vout, status: "CREDITED", amountSat });
        continue;
      }

      const [btcAsset, user] = await Promise.all([
        prisma.asset.findUnique({ where: { code: "BTC" } }),
        prisma.user.findUnique({ where: { id: session.id }, select: { email: true, username: true } }),
      ]);
      if (!btcAsset) { results.push({ txid, vout, status: "CONFIRMED_NO_ASSET", amountSat }); continue; }

      const wallet = await prisma.wallet.upsert({
        where: { userId_assetId: { userId: session.id, assetId: btcAsset.id } },
        create: { userId: session.id, assetId: btcAsset.id, balance: 0n },
        update: {},
      });

      await prisma.$transaction(async (tx) => {
        const txRecord = await tx.transaction.create({
          data: {
            userId: session.id,
            assetId: btcAsset.id,
            rail: "BLOCKCHAIN",
            method: "BTC",
            status: "COMPLETED",
            toWalletId: wallet.id,
            amount: BigInt(amountSat),
            reference: `btc-deposit-${txid}-${vout}`,
            metadata: { txid, vout, confirmations, address: cryptoAddr.address },
          },
        });
        await tx.ledgerEntry.create({
          data: { transactionId: txRecord.id, walletId: wallet.id, assetId: btcAsset.id, entryType: "CREDIT", amount: BigInt(amountSat) },
        });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: BigInt(amountSat) } } });
        await tx.cryptoDeposit.update({
          where: { id: depositRecord.id },
          data: { status: "CREDITED", walletId: wallet.id, txRecordId: txRecord.id },
        });
      });

      if (user) {
        const btcAmount = (amountSat / 1e8).toFixed(8).replace(/\.?0+$/, "") + " BTC";
        sendTransactionEmail({ to: user.email, username: user.username, type: "crypto_deposit", amount: btcAmount, reference: txid, method: "Bitcoin", note: `${confirmations} confirmation(s). TXID: ${txid}` }).catch(console.error);
      }
      results.push({ txid, vout, status: "CREDITED", amountSat });
    } else {
      results.push({ txid, vout, status: depositStatus, amountSat });
    }
  }

  return NextResponse.json({ deposits: results });
}
