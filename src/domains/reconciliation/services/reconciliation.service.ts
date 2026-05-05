import { BitcoinService } from '@/src/domains/crypto/services/bitcoin.service';
import prisma from '@/src/shared/database/prisma';
import type { UtxoEntry } from '@/lib/bitcoin';

// ---------- Result types ----------
export interface WalletMismatch {
  walletId: string;
  userId: string;
  assetId: string;
  storedBalance: string;
  computedBalance: string;
  difference: string;
}

export interface WalletReconciliationResult {
  totalWallets: number;
  mismatches: WalletMismatch[];
  ok: boolean;
}

export interface MomoReconciliationResult {
  pendingTopups: number;
  pendingWithdrawals: number;
  note: string;
}

export interface BtcAddressDetail {
  userId: string;
  address: string;
  recorded: string;
  onChain: string;
  diff: string;
  error?: string;
}

export interface BtcReconciliationResult {
  totalWalletsCount: number;
  totalRecordedBalance: string;
  note?: string;
  totalOnChainBalance?: string;
  diff?: string;
  addresses?: BtcAddressDetail[];
}

// ---------- Service ----------
export class ReconciliationService {
  /**
   * Compares each wallet's stored balance with the sum of its ledger entries.
   * Returns any mismatches found.
   */
  static async reconcileWallets(): Promise<WalletReconciliationResult> {
    const wallets = await prisma.wallet.findMany({
      select: { id: true, userId: true, assetId: true, balance: true },
    });

    const mismatches: WalletMismatch[] = [];

    for (const wallet of wallets) {
      const lastEntry = await prisma.ledgerEntry.findFirst({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });

      const computedBalance = lastEntry?.balanceAfter ?? 0n;

      if (wallet.balance !== computedBalance) {
        mismatches.push({
          walletId: wallet.id,
          userId: wallet.userId,
          assetId: wallet.assetId,
          storedBalance: wallet.balance.toString(),
          computedBalance: computedBalance.toString(),
          difference: (wallet.balance - computedBalance).toString(),
        });
      }
    }

    return {
      totalWallets: wallets.length,
      mismatches,
      ok: mismatches.length === 0,
    };
  }

  /**
   * Reconciles pending MoMo top‑up/withdraw requests by re‑checking their status with MTN.
   */
  static async reconcileMomoRequests(): Promise<MomoReconciliationResult> {
    const pendingTopups = await prisma.topupRequest.findMany({
      where: { status: 'PENDING' },
      select: { id: true, externalRef: true },
    });

    const pendingWithdrawals = await prisma.withdrawRequest.findMany({
      where: { status: 'PENDING' },
      select: { id: true, externalRef: true },
    });

    return {
      pendingTopups: pendingTopups.length,
      pendingWithdrawals: pendingWithdrawals.length,
      note: 'Full MTN reconciliation not yet automated – call /api/momo/status for each reference manually.',
    };
  }

  /**
   * Compares the recorded BTC balance across all user wallets with the sum of UTXOs from each user's address.
   * This is heavier and could be done on demand.
   */
  static async reconcileBtcBalances(full = false): Promise<BtcReconciliationResult> {
    const btcAsset = await prisma.asset.findUnique({ where: { code: 'BTC' } });
    if (!btcAsset) throw new Error('BTC asset not found');

    const wallets = await prisma.wallet.findMany({
      where: { assetId: btcAsset.id },
      include: {
        user: {
          select: {
            cryptoAddresses: {
              where: { coin: 'BTC' },
              select: { address: true },
            },
          },
        },
      },
    });

    const totalRecorded = wallets.reduce((sum, w) => sum + w.balance, 0n);

    const result: BtcReconciliationResult = {
      totalWalletsCount: wallets.length,
      totalRecordedBalance: totalRecorded.toString(),
    };

    if (full) {
      let totalOnChain = 0n;
      const addressDetails: BtcAddressDetail[] = [];

      for (const wallet of wallets) {
        const btcAddr = wallet.user?.cryptoAddresses[0]?.address;
        if (!btcAddr) continue;

        try {
          const utxos = await BitcoinService.fetchUtxos(btcAddr);
          const balance = utxos.reduce((sum: bigint, utxo: UtxoEntry) => sum + BigInt(utxo.value), 0n);
          totalOnChain += balance;
          addressDetails.push({
            userId: wallet.userId,
            address: btcAddr,
            recorded: wallet.balance.toString(),
            onChain: balance.toString(),
            diff: (balance - wallet.balance).toString(),
          });
        } catch (err) {
          addressDetails.push({
            userId: wallet.userId,
            address: btcAddr,
            recorded: wallet.balance.toString(),
            onChain: '0',
            diff: '0',
            error: err instanceof Error ? err.message : 'UTXO fetch failed',
          });
        }
      }

      result.totalOnChainBalance = totalOnChain.toString();
      result.diff = (totalOnChain - totalRecorded).toString();
      result.addresses = addressDetails;
    } else {
      result.note = 'Add ?full=true to compare on‑chain balances (expensive).';
    }

    return result;
  }
}