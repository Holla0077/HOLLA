import prisma from '@/src/shared/database/prisma';
import { LedgerService } from '@/src/domains/ledger/services/ledger.service';
export class WalletService {
  /**
   * Get all wallets for a user, including asset details.
   */
  static async getUserWallets(userId: string) {
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        asset: { select: { code: true, name: true, type: true } },
      },
    });
    return wallets.map((w) => ({
      id: w.id,
      assetId: w.assetId,
      code: w.asset.code,
      name: w.asset.name,
      type: w.asset.type as 'FIAT' | 'CRYPTO',
      balance: w.balance.toString(),
    }));
  }

  /**
   * Ensure core assets exist and create default wallets for a new user.
   * Called once during signup.
   */
  static async initializeUserWallets(userId: string) {
    const CORE_ASSETS = [
      { code: 'GHS', name: 'Ghana Cedi', type: 'FIAT' as const },
      { code: 'BTC', name: 'Bitcoin', type: 'CRYPTO' as const },
      { code: 'LTC', name: 'Litecoin', type: 'CRYPTO' as const },
      { code: 'ETH', name: 'Ethereum', type: 'CRYPTO' as const },
      { code: 'DASH', name: 'Dashcoin', type: 'CRYPTO' as const },
      { code: 'BCH', name: 'Bitcoin Cash', type: 'CRYPTO' as const },
      { code: 'USDT_ERC20', name: 'USDT (ERC-20)', type: 'CRYPTO' as const },
      { code: 'USDC_ERC20', name: 'USDC (ERC-20)', type: 'CRYPTO' as const },
    ];

    return await prisma.$transaction(async (tx) => {
      // Upsert assets
      for (const a of CORE_ASSETS) {
        await tx.asset.upsert({
          where: { code: a.code },
          update: { name: a.name, type: a.type },
          create: { code: a.code, name: a.name, type: a.type },
        });
      }

      const assets = await tx.asset.findMany({
        where: { code: { in: CORE_ASSETS.map((x) => x.code) } },
        select: { id: true },
      });

      // Create wallets
      for (const asset of assets) {
        const wallet = await tx.wallet.upsert({
          where: { userId_assetId: { userId, assetId: asset.id } },
          update: {},
          create: { userId, assetId: asset.id, balance: 0n },
        });

        // Create initial ledger entry (zero balance)
        await LedgerService.createEntry(tx, {
          userId,
          walletId: wallet.id,
          assetId: asset.id,
          amount: 0n,
          type: 'DEPOSIT',          // initial funding
          direction: 'CREDIT',
          reference: `init_${userId}`,
          metadata: { note: 'Wallet initialization' },
          lastBalance: 0n,
        });
      }
    });
  }
}