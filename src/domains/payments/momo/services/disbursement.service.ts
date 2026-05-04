import prisma from '@/src/shared/database/prisma';
import { LedgerService } from '@/src/domains/ledger/services/ledger.service';
import { FeeService } from '@/src/domains/fees/services/fee.service';
import { transfer, normalizePhone } from '@/lib/mtn-momo';
import { TransactionMethod } from '@prisma/client';

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

export class DisbursementService {
  static async requestWithdrawal(params: {
    userId: string;
    walletId: string;
    amountGhs: string;
    phone: string;
    network: string;
  }) {
    const { userId, walletId, amountGhs, phone, network } = params;
    const amountPesewas = toPesewas(amountGhs);
    if (!amountPesewas || amountPesewas < 100n) throw new Error('Minimum withdrawal GH₵1');
    if (amountPesewas > 1_000_000n) throw new Error('Maximum withdrawal GH₵10,000');

    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId },
      include: { asset: true },
    });
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.asset?.code !== 'GHS') throw new Error('Withdrawal only for GHS wallet');

    // Calculate fee
    const feeAmount = FeeService.calculateFee(amountPesewas, 'WITHDRAWAL');
    const totalDebit = amountPesewas + feeAmount;

    if (wallet.balance < totalDebit) {
      throw new Error(
        `Insufficient balance: need GH₵${(Number(totalDebit) / 100).toFixed(2)} (including fee)`
      );
    }

    const isMtn = network.toUpperCase() === 'MTN';
    const hasMtnCreds = !!(process.env.MTN_CONSUMER_KEY && process.env.MTN_DISBURSEMENT_KEY);

    if (isMtn && hasMtnCreds) {
      // Deduct first via ledger and create withdraw request
      const { withReq, tx } = await prisma.$transaction(async (db) => {
        // Debit the main withdrawal amount
        await LedgerService.createEntry(db, {
          userId,
          walletId,
          assetId: wallet.assetId,
          amount: amountPesewas,
          type: 'WITHDRAWAL',
          direction: 'DEBIT',
          reference: `wdr_${Date.now()}`,
          metadata: { phone, network, type: 'WITHDRAW' },
        });

        // Debit fee (if any)
        if (feeAmount > 0n) {
          await FeeService.chargeFee({
            tx: db,
            userId,
            walletId,
            assetId: wallet.assetId,
            feeAmount,
            feeType: 'WITHDRAWAL',
            reference: `wdr_fee_${Date.now()}`,
          });
        }

        const tx = await db.transaction.create({
          data: {
            userId,
            assetId: wallet.assetId,
            rail: 'GHANA',
            method: networkToMethod(network),
            status: 'PENDING',
            amount: amountPesewas,
            feeTotal: feeAmount,
            fromWalletId: walletId,
            metadata: { phone: normalizePhone(phone), network: network.toUpperCase(), type: 'WITHDRAW', fee: feeAmount.toString() },
          },
        });

        const withReq = await db.withdrawRequest.create({
          data: {
            userId,
            walletId,
            amount: amountPesewas,
            phone: normalizePhone(phone),
            network: network.toUpperCase(),
            status: 'PENDING',
            transactionId: tx.id,
          },
        });

        return { withReq, tx };
      });

      // Call MTN
      let referenceId: string;
      try {
        const result = await transfer(
          phone,
          amountPesewas,
          `Holla withdrawal GH₵ ${(Number(amountPesewas) / 100).toFixed(2)}`
        );
        referenceId = result.referenceId;
      } catch (err) {
        // Refund the debited amount + fee
        await prisma.$transaction(async (db) => {
          await LedgerService.createEntry(db, {
            userId,
            walletId,
            assetId: wallet.assetId,
            amount: totalDebit,
            type: 'DEPOSIT',
            direction: 'CREDIT',
            reference: `refund_${tx.id}`,
            metadata: { reason: 'MTN transfer failed' },
          });
          await db.withdrawRequest.update({
            where: { id: withReq.id },
            data: { status: 'FAILED', failureReason: err instanceof Error ? err.message : 'MTN error' },
          });
          await db.transaction.update({ where: { id: tx.id }, data: { status: 'FAILED' } });
        });
        throw err;
      }

      await prisma.$transaction([
        prisma.withdrawRequest.update({ where: { id: withReq.id }, data: { externalRef: referenceId } }),
        prisma.transaction.update({ where: { id: tx.id }, data: { reference: referenceId } }),
      ]);

      return { status: 'PENDING' as const, referenceId, withdrawRequestId: withReq.id, transactionId: tx.id };
    } else {
      // Non‑MTN or sandbox – immediate
      const { tx } = await prisma.$transaction(async (db) => {
        await LedgerService.createEntry(db, {
          userId,
          walletId,
          assetId: wallet.assetId,
          amount: amountPesewas,
          type: 'WITHDRAWAL',
          direction: 'DEBIT',
          reference: `wdr_demo_${Date.now()}`,
          metadata: { phone, network, note: 'Instant demo withdrawal' },
        });

        if (feeAmount > 0n) {
          await FeeService.chargeFee({
            tx: db,
            userId,
            walletId,
            assetId: wallet.assetId,
            feeAmount,
            feeType: 'WITHDRAWAL',
            reference: `wdr_fee_demo_${Date.now()}`,
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
            feeTotal: feeAmount,
            fromWalletId: walletId,
            metadata: { phone, network, type: 'WITHDRAW', note: 'Instant', fee: feeAmount.toString() },
          },
        });

        await db.withdrawRequest.create({
          data: {
            userId,
            walletId,
            amount: amountPesewas,
            phone: normalizePhone(phone),
            network: network.toUpperCase(),
            status: 'COMPLETED',
            providerStatus: 'SUCCESSFUL',
            transactionId: tx.id,
          },
        });

        return { tx };
      });

      return { status: 'COMPLETED' as const, transactionId: tx.id };
    }
  }
}