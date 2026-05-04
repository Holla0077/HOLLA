import { Prisma } from '@prisma/client';
import { LedgerEntryType, LedgerDirection } from './types';

export interface CreateEntryParams {
  userId: string;
  walletId: string;
  assetId: string;
  amount: bigint;
  type: LedgerEntryType;
  direction: LedgerDirection;
  reference?: string;
  metadata?: Prisma.InputJsonValue;
}

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
      metadata: params.metadata ?? ({} as Prisma.InputJsonValue),
    };
  }
}