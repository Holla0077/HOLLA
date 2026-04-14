import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as ecc from "@bitcoinerlab/secp256k1";
import { fetchAddressUtxos, UtxoEntry } from "@/lib/bitcoin";
import ECPairFactory from "ecpair";

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

function network(): bitcoin.Network {
  return process.env.BTC_NETWORK === "testnet"
    ? bitcoin.networks.testnet
    : bitcoin.networks.bitcoin;
}

function blockstreamBase(): string {
  return process.env.BTC_NETWORK === "testnet"
    ? "https://blockstream.info/testnet/api"
    : "https://blockstream.info/api";
}

function deriveChildNode(hdIndex: number) {
  const seedHex = process.env.BTC_MASTER_SEED;
  if (!seedHex) throw new Error("BTC_MASTER_SEED not set");
  const seed = Buffer.from(seedHex, "hex");
  const net = network();
  const root = bip32.fromSeed(seed, net);
  const coinType = net === bitcoin.networks.testnet ? 1 : 0;
  return root.derivePath(`m/44'/${coinType}'/0'/0/${hdIndex}`);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { toAddress, amountSatoshis } = (await req.json()) as {
      toAddress: string;
      amountSatoshis: number;
    };

    if (!amountSatoshis || amountSatoshis <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const net = network();
    try {
      bitcoin.address.toOutputScript(toAddress, net);
    } catch {
      return NextResponse.json({ error: "Invalid Bitcoin address" }, { status: 400 });
    }

    const btcRecord = await prisma.cryptoAddress.findUnique({
      where: { userId_coin: { userId: session.id, coin: "BTC" } },
    });

    if (!btcRecord) {
      return NextResponse.json({ error: "No BTC wallet found" }, { status: 404 });
    }

    const fromAddress = btcRecord.address;
    const hdIndex = btcRecord.hdIndex;

    const utxos: UtxoEntry[] = await fetchAddressUtxos(fromAddress);
    if (utxos.length === 0) {
      return NextResponse.json({ error: "No spendable funds" }, { status: 400 });
    }

    const feeRate = 10;
    let inputSum = 0;
    const selectedUtxos: UtxoEntry[] = [];
    for (const utxo of utxos) {
      selectedUtxos.push(utxo);
      inputSum += utxo.value;
      const estimatedSize = selectedUtxos.length * 200 + 200;
      const estimatedFee = estimatedSize * feeRate;
      if (inputSum >= amountSatoshis + estimatedFee) break;
    }

    if (inputSum < amountSatoshis + 200 * feeRate) {
      return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
    }

    const psbt = new bitcoin.Psbt({ network: net });
    for (const utxo of selectedUtxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(fromAddress, net),
          value: BigInt(utxo.value),
        },
      });
    }

    psbt.addOutput({
      address: toAddress,
      value: BigInt(amountSatoshis),
    });

    const estimatedSize = selectedUtxos.length * 200 + 200;
    const fee = estimatedSize * feeRate;
    const change = inputSum - amountSatoshis - fee;
    if (change > 546) {
      psbt.addOutput({
        address: fromAddress,
        value: BigInt(change),
      });
    }

    const childNode = deriveChildNode(hdIndex);
    const keyPair = ECPair.fromPrivateKey(Buffer.from(childNode.privateKey!), {
      network: net,
    });

    await psbt.signAllInputsAsync(keyPair);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    const rawTx = tx.toHex();

    const broadcastRes = await fetch(`${blockstreamBase()}/tx`, {
      method: "POST",
      body: rawTx,
      headers: { "Content-Type": "text/plain" },
    });

    if (!broadcastRes.ok) {
      const errorText = await broadcastRes.text();
      throw new Error(`Broadcast failed: ${errorText}`);
    }

    const txid = await broadcastRes.text();
    return NextResponse.json({ success: true, txid });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Transaction failed";
    console.error("Send BTC error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}