import { LedgerEntryType, LedgerDirection } from './types';

export interface CreateEntryParams {
  userId: string;
  walletId: string;
  assetId: string;
  amount: bigint; // always positive
  type: LedgerEntryType;
  direction: LedgerDirection;
  reference?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Builds the data needed to create a LedgerEntry, automatically
 * computing the signed amount (positive for credit, negative for debit)
 * and the new balance after the entry.
 */
export class EntryBuilder {
  constructor(private lastBalance: bigint = 0n) {}

  build(params: CreateEntryParams) {
    const signedAmount = params.direction === 'CREDIT' ? params.amount : -params.amount;
    const balanceAfter = this.lastBalance + signedAmount;
    return {
      userId: params.userId,
      walletId: params.walletId,
      assetId: params.assetId,
      amount: signedAmount,
      balanceAfter,
      type: params.type,
      direction: params.direction,
      reference: params.reference,
      metadata: params.metadata || {},
    };
  }
}