import { FeeService } from '@/src/domains/fees/services/fee.service';
import prisma from '@/src/shared/database/prisma';
import { LedgerService } from '@/src/domains/ledger/services/ledger.service';
import { requestToPay, getCollectionStatus, normalizePhone } from '@/lib/mtn-momo'; // temporary – will migrate later
import { TransactionMethod } from '@prisma/client';

// Helper functions (can be moved later)
function toPesewas(amountGhs: string) {
  const n = Number(amountGhs);
  if (!Number.isFinite(n) || n <= 0) return null;
  return BigInt(Math.round(n * 100));
}

function networkToMethod(network: string): TransactionMethod {
  const n = network.toUpperCase();
  if (n === 'MTN') return 'MTN_MOMO';
  if (n === 'TELECEL' || n === 'VODAFONE') return 'TELECEL_MOMO';
  if (n === 'AIRTELTIGO' || n === 'AT') return 'AT_MONEY';
  return 'MTN_MOMO';
}

export class CollectionService {
  /**
   * Initiate a MoMo top‑up request.
   * Returns the referenceId and topup request ID.
   */
  static async requestTopUp(params: {
    userId: string;
    walletId: string;
    amountGhs: string;
    phone: string;
    network: string;
  }) {
    const { userId, walletId, amountGhs, phone, network } = params;

    const amountPesewas = toPesewas(amountGhs);
    if (!amountPesewas || amountPesewas < 100n) throw new Error('Invalid amount (min GH₵1)');
    if (amountPesewas > 1_000_000n) throw new Error('Maximum top‑up is GH₵10,000');

    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId },
      include: { asset: true },
    });
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.asset?.code !== 'GHS') throw new Error('MoMo top‑up only for GHS wallet');

    const isMtn = network.toUpperCase() === 'MTN';
    const hasMtnCreds = !!(process.env.MTN_CONSUMER_KEY && process.env.MTN_COLLECTION_KEY);

    const topupReq = await prisma.topupRequest.create({
      data: {
        userId,
        walletId,
        amount: amountPesewas,
        phone: normalizePhone(phone),
        network: network.toUpperCase(),
        status: 'PENDING',
      },
    });

    if (isMtn && hasMtnCreds) {
      let referenceId: string;
      try {
        const result = await requestToPay(
          phone,
          amountPesewas,
          `Holla top-up GH₵ ${(Number(amountPesewas) / 100).toFixed(2)}`
        );
        referenceId = result.referenceId;
      } catch (err) {
        await prisma.topupRequest.update({
          where: { id: topupReq.id },
          data: { status: 'FAILED', failureReason: err instanceof Error ? err.message : 'MTN error' },
        });
        throw err;
      }

      await prisma.topupRequest.update({
        where: { id: topupReq.id },
        data: { externalRef: referenceId },
      });

      const tx = await prisma.transaction.create({
        data: {
          userId,
          assetId: wallet.assetId,
          rail: 'GHANA',
          method: networkToMethod(network),
          status: 'PENDING',
          amount: amountPesewas,
          feeTotal: 0n,
          toWalletId: walletId,
          reference: referenceId,
          metadata: {
            topupRequestId: topupReq.id,
            phone: normalizePhone(phone),
            network: network.toUpperCase(),
            type: 'TOPUP',
          },
        },
      });

      await prisma.topupRequest.update({
        where: { id: topupReq.id },
        data: { transactionId: tx.id },
      });

      return { status: 'PENDING' as const, referenceId, topupRequestId: topupReq.id, transactionId: tx.id };
    } else {
      // Non‑MTN or sandbox – credit instantly
      const { tx } = await prisma.$transaction(async (db) => {
        await db.topupRequest.update({
          where: { id: topupReq.id },
          data: { status: 'COMPLETED', providerStatus: 'SUCCESSFUL' },
        });

        // Use LedgerService to credit wallet
        // Calculate fee and net amount
const topupFee = FeeService.calculateFee(amountPesewas, 'TOPUP');
const netAmount = amountPesewas - topupFee;

// Credit net amount to user
await LedgerService.createEntry(db, {
  userId,
  walletId,
  assetId: wallet.assetId,
  amount: netAmount,
  type: 'DEPOSIT',
  direction: 'CREDIT',
  reference: `topup_${topupReq.id}`,
  metadata: { phone, network, gross: amountPesewas.toString(), fee: topupFee.toString() },
});

// Charge fee to treasury
if (topupFee > 0n) {
  await FeeService.chargeFee({
    tx: db,
    userId,
    walletId,
    assetId: wallet.assetId,
    feeAmount: topupFee,
    feeType: 'TOPUP',
    reference: `topup_fee_${topupReq.id}`,
  });
}

        const tx = await db.transaction.create({
          data: {
            userId,
            assetId: wallet.assetId,
            rail: 'GHANA',
            method: networkToMethod(network),
            status: 'COMPLETED',
            amount: amountPesewas,
            feeTotal: 0n,
            toWalletId: walletId,
            metadata: { topupRequestId: topupReq.id, phone, network, type: 'TOPUP', note: 'Instant credit' },
          },
        });

        await db.topupRequest.update({ where: { id: topupReq.id }, data: { transactionId: tx.id } });
        return { tx };
      });

      return { status: 'COMPLETED' as const, topupRequestId: topupReq.id, transactionId: tx.id };
    }
  }

  /**
   * Poll MTN for top‑up status and credit wallet if successful.
   */
  static async checkAndCompleteTopUp(referenceId: string, userId: string) {
    const topupReq = await prisma.topupRequest.findFirst({
      where: { externalRef: referenceId, userId },
    });
    if (!topupReq) throw new Error('Topup request not found');

    if (topupReq.status === 'COMPLETED') return { status: 'COMPLETED' };
    if (topupReq.status === 'FAILED') return { status: 'FAILED', reason: topupReq.failureReason };

    const momoStatus = await getCollectionStatus(referenceId);

    if (momoStatus.status === 'SUCCESSFUL') {
      await prisma.$transaction(async (db) => {
        // Credit wallet via ledger
        const topupFee = FeeService.calculateFee(topupReq.amount, 'TOPUP');
const netAmount = topupReq.amount - topupFee;

const wallet = await db.wallet.findUniqueOrThrow({ where: { id: topupReq.walletId } });

await LedgerService.createEntry(db, {
  userId,
  walletId: topupReq.walletId,
  assetId: wallet.assetId,
  amount: netAmount,
  type: 'DEPOSIT',
  direction: 'CREDIT',
  reference: `momo_${referenceId}`,
  metadata: { financialTransactionId: momoStatus.financialTransactionId, gross: topupReq.amount.toString(), fee: topupFee.toString() },
});

if (topupFee > 0n) {
  await FeeService.chargeFee({
    tx: db,
    userId,
    walletId: topupReq.walletId,
    assetId: wallet.assetId,
    feeAmount: topupFee,
    feeType: 'TOPUP',
    reference: `topup_fee_${referenceId}`,
  });
}

        await db.topupRequest.update({
          where: { id: topupReq.id },
          data: { status: 'COMPLETED', providerStatus: 'SUCCESSFUL' },
        });

        if (topupReq.transactionId) {
          await db.transaction.update({
            where: { id: topupReq.transactionId },
            data: { status: 'COMPLETED' },
          });
        }
      });
      return { status: 'COMPLETED' };
    }

    if (momoStatus.status === 'FAILED') {
      await prisma.topupRequest.update({
        where: { id: topupReq.id },
        data: { status: 'FAILED', providerStatus: 'FAILED', failureReason: momoStatus.reason },
      });
      if (topupReq.transactionId) {
        await prisma.transaction.update({ where: { id: topupReq.transactionId }, data: { status: 'FAILED' } });
      }
      return { status: 'FAILED', reason: momoStatus.reason };
    }

    return { status: 'PENDING' };
  }
}