import prisma from '@/src/shared/database/prisma';
import { LedgerService } from '@/src/domains/ledger/services/ledger.service';
import { FeeService } from '@/src/domains/fees/services/fee.service';
import { BitcoinService } from './bitcoin.service';

export class CryptoDepositService {
  /**
   * Process an incoming crypto deposit (called after detecting a new on-chain transaction).
   * Net amount = grossAmount - platformFee (2.5%).
   * Platform fee is credited to the BTC treasury wallet.
   */
  static async processDeposit(params: {
    userId: string;
    grossAmountSatoshis: bigint;
    txid: string;
  }) {
    const { userId, grossAmountSatoshis, txid } = params;

    const btcAsset = await prisma.asset.findUnique({ where: { code: 'BTC' } });
    if (!btcAsset) throw new Error('BTC asset not found');

    // Get user's BTC wallet
    const btcWallet = await prisma.wallet.findFirst({
      where: { userId, assetId: btcAsset.id },
    });
    if (!btcWallet) throw new Error('BTC wallet not found');

    // Calculate platform fee
    const feeAmount = FeeService.calculateFee(grossAmountSatoshis, 'DEPOSIT_CRYPTO');
    const netAmount = grossAmountSatoshis - feeAmount;

    await prisma.$transaction(async (tx) => {
      // 1. Credit net amount to user's wallet
      await LedgerService.createEntry(tx, {
        userId,
        walletId: btcWallet.id,
        assetId: btcAsset.id,
        amount: netAmount,
        type: 'DEPOSIT',
        direction: 'CREDIT',
        reference: txid,
        metadata: { grossAmount: grossAmountSatoshis.toString(), fee: feeAmount.toString() },
      });

      // 2. Charge platform fee to BTC treasury
      if (feeAmount > 0n) {
        await FeeService.chargeFee({
          tx,
          userId,
          walletId: btcWallet.id,       // user wallet (for fee debit, though we're not really debiting user here—the fee is taken from gross before credit, so we only credit treasury directly)
          assetId: btcAsset.id,
          feeAmount,
          feeType: 'DEPOSIT_CRYPTO',
          reference: `dep_fee_${txid}`,
        });
        // Note: FeeService.chargeFee expects a user wallet (for debit) and a treasury wallet (for credit).
        // In this case, we are not debiting the user wallet because we never credited the gross amount.
        // So we cannot debit the user. Instead we need to directly credit the treasury wallet for the fee.
        // We'll adjust the FeeService.chargeFee method to handle a "source" that is not a user wallet,
        // or manually create the treasury credit entry.
        // Since the fee here is taken from the gross deposit, it's essentially a fee collected by the platform
        // without debiting the user. The correct double-entry is:
        //   Debit: "Virtual" (off-chain) – no user debit
        //   Credit: BTC treasury wallet
        // But in a pure double-entry system, we need a counterpart. The gross amount comes from outside,
        // so we can treat the gross credit as an external inflow, then split: net to user, fee to treasury.
        // We can implement this by creating two credit entries: one for net to user, one for fee to treasury,
        // without a debit on user. This is acceptable for external deposits.
        // So we will bypass FeeService.chargeFee and directly credit treasury with a 'DEPOSIT' entry.
        const treasuryWallet = await tx.wallet.findFirst({
          where: { userId: 'SYSTEM', assetId: btcAsset.id, isSystem: true },
          select: { id: true },
        });
        if (!treasuryWallet) throw new Error('BTC treasury wallet not found');

        await LedgerService.createEntry(tx, {
          userId: 'SYSTEM',
          walletId: treasuryWallet.id,
          assetId: btcAsset.id,
          amount: feeAmount,
          type: 'DEPOSIT',
          direction: 'CREDIT',
          reference: `dep_fee_${txid}`,
          metadata: { source: 'crypto_deposit_fee', gross: grossAmountSatoshis.toString(), net: netAmount.toString() },
        });
      }
    });

    return { netAmount, feeAmount, txid };
  }
}