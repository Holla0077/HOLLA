import prisma from '@/src/shared/database/prisma';
import { LedgerService } from '@/src/domains/ledger/services/ledger.service';

const SYSTEM_USER_ID = 'SYSTEM';

export class TreasuryService {
  /**
   * Get the balance of an internal treasury wallet by asset code.
   */
  static async getReserveBalance(assetCode: string): Promise<bigint> {
    const wallet = await prisma.wallet.findFirst({
      where: {
        userId: SYSTEM_USER_ID,
        asset: { code: assetCode },
        isSystem: true,
      },
      select: { balance: true },
    });
    return wallet?.balance ?? 0n;
  }

  /**
   * Transfer funds between a user wallet and an internal treasury wallet.
   * Used to capture spread profits or fees.
   */
  static async transferToTreasury(params: {
    fromUserId: string;
    fromWalletId: string;
    assetCode: string;
    amount: bigint; // always positive, credited to treasury
    reason: 'CONVERSION_SPREAD' | 'FEE' | 'PROMO_CREDIT' | 'OTHER';
    metadata?: Record<string, unknown>;
  }) {
    const { fromUserId, fromWalletId, assetCode, amount, reason, metadata = {} } = params;

    const asset = await prisma.asset.findUnique({ where: { code: assetCode } });
    if (!asset) throw new Error('Asset not found');

    const treasuryWallet = await prisma.wallet.findFirst({
      where: { userId: SYSTEM_USER_ID, assetId: asset.id, isSystem: true },
    });
    if (!treasuryWallet) throw new Error(`Treasury wallet for ${assetCode} not found`);

    await prisma.$transaction(async (tx) => {
      // Debit the source user wallet
      await LedgerService.createEntry(tx, {
        userId: fromUserId,
        walletId: fromWalletId,
        assetId: asset.id,
        amount,
        type: 'FEE',
        direction: 'DEBIT',
        reference: `treasury_${reason}_${Date.now()}`,
        metadata: { ...metadata, reason, target: 'TREASURY' },
      });

      // Credit the treasury wallet
      await LedgerService.createEntry(tx, {
        userId: SYSTEM_USER_ID,
        walletId: treasuryWallet.id,
        assetId: asset.id,
        amount,
        type: 'DEPOSIT',
        direction: 'CREDIT',
        reference: `treasury_${reason}_${Date.now()}`,
        metadata: { ...metadata, reason, sourceUserId: fromUserId },
      });
    });

    return { success: true };
  }

  /**
   * Move funds from one treasury wallet to another (e.g., settlement).
   */
  static async internalTransfer(params: {
    fromAssetCode: string;
    toAssetCode: string;
    amount: bigint;
  }) {
    // Implement cross-asset transfer with exchange rate later
    throw new Error('Not implemented yet');
  }

  /**
   * Get all treasury reserves.
   */
  static async getAllReserves() {
    const wallets = await prisma.wallet.findMany({
      where: { userId: SYSTEM_USER_ID, isSystem: true },
      include: { asset: { select: { code: true, name: true } } },
    });
    return wallets.map((w) => ({
      assetCode: w.asset.code,
      assetName: w.asset.name,
      balance: w.balance.toString(),
    }));
  }
}