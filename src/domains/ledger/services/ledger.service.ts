import { Prisma } from '@prisma/client';
import prisma from '@/src/shared/database/prisma';
import { EntryBuilder, CreateEntryParams } from './entry-builder';

export class LedgerService {
  /**
   * Creates a single ledger entry and updates the wallet balance atomically.
   * Must be called within a transactional context (pass `tx`).
   */
  static async createEntry(
    tx: Prisma.TransactionClient,
    params: CreateEntryParams & { lastBalance?: bigint }
  ) {
    // Lock wallet row and get current balance
    const wallet = await tx.wallet.findUniqueOrThrow({
      where: { id: params.walletId },
      select: { balance: true },
    });

    const lastBalance = params.lastBalance ?? wallet.balance;

    const builder = new EntryBuilder(lastBalance);
    const entryData = builder.build(params);

    // Create ledger entry
    await tx.ledgerEntry.create({ data: entryData });

    // Update wallet balance to match the new cumulative balance
    await tx.wallet.update({
      where: { id: params.walletId },
      data: { balance: entryData.balanceAfter },
    });

    return entryData;
  }

  /**
   * Get current balance of a wallet from the ledger (last entry's balanceAfter).
   */
  static async getBalance(walletId: string) {
    const lastEntry = await prisma.ledgerEntry.findFirst({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    return lastEntry?.balanceAfter ?? 0n;
  }
}