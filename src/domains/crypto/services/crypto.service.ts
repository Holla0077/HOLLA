import prisma from '@/src/shared/database/prisma';
import { LedgerService } from '@/src/domains/ledger/services/ledger.service';
import { BitcoinService } from './bitcoin.service';
import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';
import ECPairFactory from 'ecpair';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

function network(): bitcoin.Network {
  return process.env.BTC_NETWORK === 'testnet'
    ? bitcoin.networks.testnet
    : bitcoin.networks.bitcoin;
}

function derivePrivateKey(hdIndex: number): Buffer {
  const seedHex = process.env.BTC_MASTER_SEED;
  if (!seedHex) throw new Error('BTC_MASTER_SEED not set');
  const seed = Buffer.from(seedHex, 'hex');
  const net = network();
  const root = bip32.fromSeed(seed, net);
  const coinType = net === bitcoin.networks.testnet ? 1 : 0;
  const child = root.derivePath(`m/44'/${coinType}'/0'/0/${hdIndex}`);
  if (!child.privateKey) throw new Error('No private key');
  return Buffer.from(child.privateKey);
}

export class CryptoService {
  /**
   * Get or create the user‘s BTC deposit address.
   */
  static async getOrCreateBtcAddress(userId: string): Promise<{ address: string; hdIndex: number }> {
    const existing = await prisma.cryptoAddress.findUnique({
      where: { userId_coin: { userId, coin: 'BTC' } },
    });
    if (existing) return { address: existing.address, hdIndex: existing.hdIndex };

    const count = await prisma.cryptoAddress.count({ where: { coin: 'BTC' } });
    const hdIndex = count;
    const address = BitcoinService.deriveAddress(hdIndex);

    await prisma.cryptoAddress.create({
      data: { userId, coin: 'BTC', address, hdIndex },
    });
    return { address, hdIndex };
  }

  /**
   * Build, sign, broadcast a BTC transaction, and record in ledger.
   */
  static async sendBtc(params: {
    userId: string;
    toAddress: string;
    amountSatoshis: number;
  }): Promise<{ txid: string }> {
    const { userId, toAddress, amountSatoshis } = params;

    // Validate destination
    const net = network();
    try {
      bitcoin.address.toOutputScript(toAddress, net);
    } catch {
      throw new Error('Invalid Bitcoin address');
    }

    const btcRecord = await prisma.cryptoAddress.findUnique({
      where: { userId_coin: { userId, coin: 'BTC' } },
    });
    if (!btcRecord) throw new Error('No BTC wallet found');

    const fromAddress = btcRecord.address;
    const hdIndex = btcRecord.hdIndex;

    // Fetch UTXOs
    const utxos = await BitcoinService.fetchUtxos(fromAddress);
    if (utxos.length === 0) throw new Error('No spendable funds');

    // Coin selection (simplistic)
    const feeRate = 10; // sat/vB
    let inputSum = 0n;
    const selectedUtxos = [];
    for (const utxo of utxos) {
      selectedUtxos.push(utxo);
      inputSum += BigInt(utxo.value);
      const estimatedSize = selectedUtxos.length * 200 + 200;
      const estimatedFee = BigInt(estimatedSize) * BigInt(feeRate);
      if (inputSum >= BigInt(amountSatoshis) + estimatedFee) break;
    }
    if (inputSum < BigInt(amountSatoshis) + BigInt(200 * feeRate))
      throw new Error('Insufficient funds');

    // Build PSBT
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
    psbt.addOutput({ address: toAddress, value: BigInt(amountSatoshis) });

    const estimatedSize = selectedUtxos.length * 200 + 200;
    const fee = BigInt(estimatedSize) * BigInt(feeRate);
    const change = inputSum - BigInt(amountSatoshis) - fee;
    if (change > 546n) {
      psbt.addOutput({ address: fromAddress, value: change });
    }

    // Sign
    const privateKey = derivePrivateKey(hdIndex);
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey));
    await psbt.signAllInputsAsync(keyPair);
    psbt.finalizeAllInputs();

    const rawTx = psbt.extractTransaction().toHex();

    // Broadcast
    const blockstreamBase = process.env.BTC_NETWORK === 'testnet'
      ? 'https://blockstream.info/testnet/api'
      : 'https://blockstream.info/api';
    const broadcastRes = await fetch(`${blockstreamBase}/tx`, {
      method: 'POST',
      body: rawTx,
      headers: { 'Content-Type': 'text/plain' },
    });
    if (!broadcastRes.ok) {
      const errText = await broadcastRes.text();
      throw new Error(`Broadcast failed: ${errText}`);
    }
    const txid = await broadcastRes.text();

    // Record debit in ledger
    const btcAsset = await prisma.asset.findUnique({ where: { code: 'BTC' } });
    if (!btcAsset) throw new Error('BTC asset not found');
    const btcWallet = await prisma.wallet.findFirst({
      where: { userId, assetId: btcAsset.id },
    });
    if (!btcWallet) throw new Error('BTC wallet not found');

    await prisma.$transaction(async (tx) => {
      await LedgerService.createEntry(tx, {
        userId,
        walletId: btcWallet.id,
        assetId: btcAsset.id,
        amount: BigInt(amountSatoshis),
        type: 'WITHDRAWAL',
        direction: 'DEBIT',
        reference: txid,
        metadata: { toAddress },
      });
    });

    return { txid };
  }
}