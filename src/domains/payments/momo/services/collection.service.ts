import { FeeService } from '@/src/domains/fees/services/fee.service';
import prisma from '@/src/shared/database/prisma';
import { LedgerService } from '@/src/domains/ledger/services/ledger.service';
import { requestToPay, getCollectionStatus, normalizePhone, type MoMoPaymentStatus } from '@/lib/mtn-momo'; // temporary – will migrate later
import { TransactionMethod, type TopupRequest } from '@prisma/client';

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

function ensureAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getCollectionCallbackUrl() {
  const explicitUrl = process.env.MTN_COLLECTION_CALLBACK_URL || process.env.MTN_MOMO_COLLECTION_CALLBACK_URL;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const baseUrl = explicitUrl
    ? ensureAbsoluteUrl(explicitUrl)
    : appUrl
      ? `${ensureAbsoluteUrl(appUrl).replace(/\/+$/, '')}/api/topup/momo/webhook`
      : '';
  if (!baseUrl) return undefined;

  const secret = process.env.MTN_COLLECTION_WEBHOOK_SECRET;
  if (!secret) return baseUrl;

  try {
    const callbackUrl = new URL(baseUrl);
    if (!callbackUrl.searchParams.has('token')) {
      callbackUrl.searchParams.set('token', secret);
    }
    return callbackUrl.toString();
  } catch {
    console.warn('[topup/momo] invalid MTN collection callback URL configured');
    return undefined;
  }
}

type ConfirmationSource = 'poll' | 'webhook' | 'reconciliation';

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
    const normalizedPhone = normalizePhone(phone);
    const normalizedNetwork = network.toUpperCase();

    const topupReq = await prisma.topupRequest.create({
      data: {
        userId,
        walletId,
        amount: amountPesewas,
        phone: normalizedPhone,
        network: normalizedNetwork,
        status: 'PENDING',
      },
    });
    console.info('[topup/momo] topupRequest created', {
      topupRequestId: topupReq.id,
      walletId,
      network: normalizedNetwork,
    });

    if (isMtn && hasMtnCreds) {
      let referenceId: string;
      const callbackUrl = getCollectionCallbackUrl();
      try {
        const result = await requestToPay(
          normalizedPhone,
          amountPesewas,
          `Holla top-up GH₵ ${(Number(amountPesewas) / 100).toFixed(2)}`,
          callbackUrl
        );
        referenceId = result.referenceId;
        console.info('[topup/momo] MTN requestToPay accepted', {
          topupRequestId: topupReq.id,
          referenceId,
          accepted: true,
          callbackConfigured: Boolean(callbackUrl),
        });
      } catch (err) {
        console.error('[topup/momo] MTN requestToPay failed', {
          topupRequestId: topupReq.id,
          accepted: false,
          error: err instanceof Error ? err.message : 'MTN error',
        });
        await prisma.topupRequest.update({
          where: { id: topupReq.id },
          data: {
            status: 'FAILED',
            providerStatus: 'FAILED',
            failureReason: err instanceof Error ? err.message : 'MTN error',
          },
        });
        throw err;
      }

      await prisma.topupRequest.update({
        where: { id: topupReq.id },
        data: {
          externalRef: referenceId,
          status: 'PENDING',
          providerStatus: 'PENDING',
        },
      });
      console.info('[topup/momo] MTN reference stored', {
        topupRequestId: topupReq.id,
        referenceId,
      });

      try {
        const pendingTransaction = await prisma.$transaction(async (prismaTx) => {
          const pendingTransactionRecord = await prismaTx.transaction.create({
            data: {
              userId,
              assetId: wallet.assetId,
              rail: 'GHANA',
              method: networkToMethod(normalizedNetwork),
              status: 'PENDING',
              amount: amountPesewas,
              feeTotal: 0n,
              toWalletId: walletId,
              reference: referenceId,
              metadata: {
                topupRequestId: topupReq.id,
                phone: normalizedPhone,
                network: normalizedNetwork,
                type: 'TOPUP',
              },
            },
          });

          await prismaTx.topupRequest.update({
            where: { id: topupReq.id },
            data: { transactionId: pendingTransactionRecord.id },
          });

          return pendingTransactionRecord;
        });

        console.info('[topup/momo] pending transaction created', {
          topupRequestId: topupReq.id,
          referenceId,
          transactionId: pendingTransaction.id,
          prismaTransactionCreated: true,
        });

        return { status: 'PENDING' as const, referenceId, topupRequestId: topupReq.id, transactionId: pendingTransaction.id };
      } catch (err) {
        console.error('[topup/momo] pending transaction creation failed', {
          topupRequestId: topupReq.id,
          referenceId,
          prismaTransactionCreated: false,
          error: err instanceof Error ? err.message : 'Prisma transaction error',
        });
        return { status: 'PENDING' as const, referenceId, topupRequestId: topupReq.id, transactionId: undefined };
      }
    } else {
      // Non‑MTN or sandbox – credit instantly
      const { pendingTransaction } = await prisma.$transaction(async (prismaTx) => {
        await prismaTx.topupRequest.update({
          where: { id: topupReq.id },
          data: { status: 'COMPLETED', providerStatus: 'SUCCESSFUL' },
        });

        // Use LedgerService to credit wallet
        // Calculate fee and net amount
        const topupFee = FeeService.calculateFee(amountPesewas, 'TOPUP');
        const netAmount = amountPesewas - topupFee;

        // Credit net amount to user
        await LedgerService.createEntry(prismaTx, {
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
            tx: prismaTx,
            userId,
            walletId,
            assetId: wallet.assetId,
            feeAmount: topupFee,
            feeType: 'TOPUP',
            reference: `topup_fee_${topupReq.id}`,
          });
        }

        const pendingTransaction = await prismaTx.transaction.create({
          data: {
            userId,
            assetId: wallet.assetId,
            rail: 'GHANA',
            method: networkToMethod(normalizedNetwork),
            status: 'COMPLETED',
            amount: amountPesewas,
            feeTotal: 0n,
            toWalletId: walletId,
            metadata: { topupRequestId: topupReq.id, phone: normalizedPhone, network: normalizedNetwork, type: 'TOPUP', note: 'Instant credit' },
          },
        });

        await prismaTx.topupRequest.update({ where: { id: topupReq.id }, data: { transactionId: pendingTransaction.id } });
        return { pendingTransaction };
      });

      return { status: 'COMPLETED' as const, topupRequestId: topupReq.id, transactionId: pendingTransaction.id };
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

    return this.confirmTopUpRequest(topupReq, 'poll');
  }

  /**
   * Confirm an MTN callback by re-querying MTN with the external reference.
   * The callback payload is treated as a signal only; MTN status remains authoritative.
   */
  static async handleCollectionWebhook(referenceId: string) {
    const topupReq = await prisma.topupRequest.findFirst({
      where: { externalRef: referenceId },
    });
    if (!topupReq) throw new Error('Topup request not found');

    return this.confirmTopUpRequest(topupReq, 'webhook');
  }

  private static async confirmTopUpRequest(topupReq: TopupRequest, source: ConfirmationSource) {
    if (!topupReq.externalRef) throw new Error('Topup request has no MTN reference');
    if (topupReq.status === 'COMPLETED') {
      return { status: 'COMPLETED' as const, transactionId: topupReq.transactionId ?? undefined, alreadyProcessed: true };
    }
    if (topupReq.status === 'FAILED') {
      return { status: 'FAILED' as const, reason: topupReq.failureReason ?? undefined, alreadyProcessed: true };
    }

    const momoStatus = await getCollectionStatus(topupReq.externalRef);
    console.info('[topup/momo/confirm] provider status', {
      topupRequestId: topupReq.id,
      referenceId: topupReq.externalRef,
      providerStatus: momoStatus.status,
      source,
    });

    return this.applyProviderStatus(topupReq, topupReq.externalRef, momoStatus, source);
  }

  private static async applyProviderStatus(
    topupReq: TopupRequest,
    referenceId: string,
    momoStatus: MoMoPaymentStatus,
    source: ConfirmationSource
  ) {
    if (momoStatus.status === 'SUCCESSFUL') {
      const result = await prisma.$transaction(async (prismaTx) => {
        const claim = await prismaTx.topupRequest.updateMany({
          where: { id: topupReq.id, status: 'PENDING' },
          data: { status: 'COMPLETED', providerStatus: 'SUCCESSFUL' },
        });

        if (claim.count === 0) {
          const current = await prismaTx.topupRequest.findUnique({
            where: { id: topupReq.id },
            select: { status: true, failureReason: true, transactionId: true },
          });
          return {
            status: current?.status === 'FAILED' ? 'FAILED' as const : current?.status === 'COMPLETED' ? 'COMPLETED' as const : 'PENDING' as const,
            reason: current?.failureReason ?? undefined,
            transactionId: current?.transactionId ?? undefined,
            alreadyProcessed: true,
          };
        }

        const topupFee = FeeService.calculateFee(topupReq.amount, 'TOPUP');
        const netAmount = topupReq.amount - topupFee;
        const wallet = await prismaTx.wallet.findUniqueOrThrow({ where: { id: topupReq.walletId } });

        await LedgerService.createEntry(prismaTx, {
          userId: topupReq.userId,
          walletId: topupReq.walletId,
          assetId: wallet.assetId,
          amount: netAmount,
          type: 'DEPOSIT',
          direction: 'CREDIT',
          reference: `momo_${referenceId}`,
          metadata: {
            financialTransactionId: momoStatus.financialTransactionId,
            gross: topupReq.amount.toString(),
            fee: topupFee.toString(),
            source,
          },
        });

        if (topupFee > 0n) {
          await FeeService.chargeFee({
            tx: prismaTx,
            userId: topupReq.userId,
            walletId: topupReq.walletId,
            assetId: wallet.assetId,
            feeAmount: topupFee,
            feeType: 'TOPUP',
            reference: `topup_fee_${referenceId}`,
          });
        }

        let transactionId = topupReq.transactionId ?? undefined;
        if (transactionId) {
          const updated = await prismaTx.transaction.updateMany({
            where: { id: transactionId },
            data: { status: 'COMPLETED', feeTotal: topupFee },
          });
          if (updated.count === 0) transactionId = undefined;
        }

        if (!transactionId) {
          const existing = await prismaTx.transaction.findUnique({
            where: { reference: referenceId },
            select: { id: true },
          });

          if (existing) {
            transactionId = existing.id;
            await prismaTx.transaction.update({
              where: { id: existing.id },
              data: { status: 'COMPLETED', feeTotal: topupFee },
            });
          } else {
            const completedTransaction = await prismaTx.transaction.create({
              data: {
                userId: topupReq.userId,
                assetId: wallet.assetId,
                rail: 'GHANA',
                method: networkToMethod(topupReq.network),
                status: 'COMPLETED',
                amount: topupReq.amount,
                feeTotal: topupFee,
                toWalletId: topupReq.walletId,
                reference: referenceId,
                metadata: {
                  topupRequestId: topupReq.id,
                  phone: topupReq.phone,
                  network: topupReq.network,
                  type: 'TOPUP',
                  source,
                  financialTransactionId: momoStatus.financialTransactionId,
                },
              },
            });
            transactionId = completedTransaction.id;
          }

          await prismaTx.topupRequest.update({
            where: { id: topupReq.id },
            data: { transactionId },
          });
        }

        return { status: 'COMPLETED' as const, transactionId, alreadyProcessed: false };
      });

      console.info('[topup/momo/confirm] topup completed', {
        topupRequestId: topupReq.id,
        referenceId,
        transactionId: result.transactionId,
        alreadyProcessed: result.alreadyProcessed,
        source,
      });
      return result;
    }

    if (momoStatus.status === 'FAILED') {
      const failureReason = momoStatus.reason || 'Payment failed';
      const result = await prisma.$transaction(async (prismaTx) => {
        const claim = await prismaTx.topupRequest.updateMany({
          where: { id: topupReq.id, status: 'PENDING' },
          data: { status: 'FAILED', providerStatus: 'FAILED', failureReason },
        });

        if (claim.count === 0) {
          const current = await prismaTx.topupRequest.findUnique({
            where: { id: topupReq.id },
            select: { status: true, failureReason: true, transactionId: true },
          });
          return {
            status: current?.status === 'COMPLETED' ? 'COMPLETED' as const : current?.status === 'FAILED' ? 'FAILED' as const : 'PENDING' as const,
            reason: current?.failureReason ?? undefined,
            transactionId: current?.transactionId ?? undefined,
            alreadyProcessed: true,
          };
        }

        if (topupReq.transactionId) {
          await prismaTx.transaction.updateMany({
            where: { id: topupReq.transactionId },
            data: { status: 'FAILED' },
          });
        }

        return { status: 'FAILED' as const, reason: failureReason, transactionId: topupReq.transactionId ?? undefined, alreadyProcessed: false };
      });

      console.info('[topup/momo/confirm] topup failed', {
        topupRequestId: topupReq.id,
        referenceId,
        reason: result.reason,
        alreadyProcessed: result.alreadyProcessed,
        source,
      });
      return result;
    }

    await prisma.topupRequest.updateMany({
      where: { id: topupReq.id, status: 'PENDING' },
      data: { providerStatus: 'PENDING' },
    });
    return { status: 'PENDING' };
  }
}
