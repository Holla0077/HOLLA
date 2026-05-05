import { TreasuryService } from '@/src/domains/treasury/services/treasury.service';
import prisma from '@/src/shared/database/prisma';
import { LedgerService } from '@/src/domains/ledger/services/ledger.service';
import { Prisma } from '@prisma/client';


export type FeeType = 'TRANSFER' | 'WITHDRAWAL' | 'TOPUP' | 'SELL' | 'DEPOSIT_CRYPTO';
export interface FeeRule {
  type: FeeType;
  fixed: bigint;       // flat fee (e.g., 100n = GH₵1)
  percentage: number;  // e.g., 0.01 = 1%
  min?: bigint;
  max?: bigint;
  treasuryAssetCode: string; // e.g., 'GHS'
}

// Default fee rules – modify these as you like
const defaultRules: FeeRule[] = [
  {
    type: 'DEPOSIT_CRYPTO',          // new – BTC / crypto receives
    fixed: 0n,
    percentage: 0.025,                // 2.5 %
    treasuryAssetCode: 'BTC',         // fee taken in BTC
  },
  {
    type: 'WITHDRAWAL',
    fixed: 0n,
    percentage: 0.01,                 // 1 %
    min: 100n,                        // GH₵1 minimum
    treasuryAssetCode: 'GHS',
  },
  {
    type: 'TRANSFER',
    fixed: 0n,
    percentage: 0,                    // free KashBoy‑to‑KashBoy
    treasuryAssetCode: 'GHS',
  },
  {
    type: 'TOPUP',
    fixed: 0n,
    percentage: 0.025,                    // 2.5% top‑ups
    treasuryAssetCode: 'GHS',
  },
  {
    type: 'SELL',
    fixed: 0n,
    percentage: 0,                    // free Sell (for now)
    treasuryAssetCode: 'GHS',
  },
];

export class FeeService {
  /**
   * Calculate the total fee for a given transaction.
   * Returns the fee in the smallest unit of the treasury asset.
   */
  static calculateFee(amount: bigint, feeType: FeeType): bigint {
    const rule = defaultRules.find(r => r.type === feeType);
    if (!rule) return 0n;

    let fee = rule.fixed;
    if (rule.percentage > 0) {
      const percentageFee = (amount * BigInt(Math.round(rule.percentage * 10000))) / 10000n;
      fee += percentageFee;
    }
    if (rule.min && fee < rule.min) fee = rule.min;
    if (rule.max && fee > rule.max) fee = rule.max;
    return fee;
  }

  /**
   * Charge a fee and move it from the user's wallet to the treasury.
   * This should be called inside a database transaction.
   */
  static async chargeFee(params: {
    tx: Prisma.TransactionClient,  // <-- updated
    userId: string,
    walletId: string,
    assetId: string,
    feeAmount: bigint,
    feeType: FeeType,
    reference?: string,
  }) {
    const { tx, userId, walletId, assetId, feeAmount, feeType, reference } = params;
    if (feeAmount <= 0n) return; // no fee

    // Debit user wallet
    await LedgerService.createEntry(tx, {
      userId,
      walletId,
      assetId,
      amount: feeAmount,
      type: 'FEE',
      direction: 'DEBIT',
      reference: reference || `fee_${feeType}_${Date.now()}`,
      metadata: { feeType },
    });

    // Find treasury wallet for this asset
    const treasuryWallet = await tx.wallet.findFirst({
      where: { userId: 'SYSTEM', assetId, isSystem: true },
      select: { id: true },
    });
    if (!treasuryWallet) throw new Error(`Treasury wallet not found for asset ${assetId}`);

    // Credit treasury
    await LedgerService.createEntry(tx, {
      userId: 'SYSTEM',
      walletId: treasuryWallet.id,
      assetId,
      amount: feeAmount,
      type: 'DEPOSIT',
      direction: 'CREDIT',
      reference: reference || `fee_${feeType}_${Date.now()}`,
      metadata: { feeType, sourceUserId: userId },
    });
  }
}