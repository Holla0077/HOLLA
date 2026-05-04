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

      // 2. Charge platform fee to BTC treasury (direct credit, no user debit)
if (feeAmount > 0n) {
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