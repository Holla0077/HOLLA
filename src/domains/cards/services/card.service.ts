import prisma from '@/src/shared/database/prisma';
import type { CreateCardInput } from '../models/card.types';

export class CardService {
  /**
   * Create a new gift card (virtual). Initially in CREATED status.
   */
  static async createCard(input: CreateCardInput) {
    return prisma.card.create({
      data: {
        type: input.type,
        currency: input.currency || (input.type === 'BTC_GIFT' ? 'BTC' : 'GHS'),
        initialValue: input.initialValue,
        remainingValue: input.initialValue,
        isReloadable: input.isReloadable ?? false,
        kycRequired: input.kycRequired ?? false,
        expiresAt: input.expiresAt || undefined,
        ownerId: input.userId || null,
      },
    });
  }

  /**
   * Activate a card (must be in CREATED status).
   */
  static async activateCard(cardId: string) {
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card || card.status !== 'CREATED') throw new Error('Card cannot be activated');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.card.update({
        where: { id: cardId },
        data: {
          status: 'ACTIVATED',
          activatedAt: new Date(),
        },
      });
      await tx.cardTransaction.create({
        data: {
          cardId,
          type: 'ACTIVATE',
          amount: 0n,
          balanceAfter: card.remainingValue,
        },
      });
      return updated;
    });
  }

  /**
   * Redeem a card (spend its value). In practice, the merchant calls this.
   * For now we just mark as REDEEMED.
   */
  static async redeemCard(cardId: string, amount: bigint) {
    return prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({ where: { id: cardId } });
      if (!card || card.status !== 'ACTIVATED') throw new Error('Card not redeemable');
      if (card.remainingValue < amount) throw new Error('Insufficient card balance');

      const newBalance = card.remainingValue - amount;
      await tx.card.update({
        where: { id: cardId },
        data: {
          remainingValue: newBalance,
          status: newBalance === 0n ? 'REDEEMED' : 'ACTIVATED',
          redeemedAt: newBalance === 0n ? new Date() : undefined,
        },
      });
      await tx.cardTransaction.create({
        data: {
          cardId,
          type: 'REDEEM',
          amount,
          balanceAfter: newBalance,
        },
      });

      // TODO: Credit merchant wallet or settle payment
      return { success: true, newBalance: newBalance.toString() };
    });
  }

  /**
   * Top‑up (reload) a reloadable card.
   */
  static async topUpCard(cardId: string, amount: bigint) {
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card || !card.isReloadable || card.status !== 'ACTIVATED') throw new Error('Card not reloadable');

    const newBalance = card.remainingValue + amount;
    await prisma.$transaction([
      prisma.card.update({
        where: { id: cardId },
        data: { remainingValue: newBalance },
      }),
      prisma.cardTransaction.create({
        data: {
          cardId,
          type: 'TOPUP',
          amount,
          balanceAfter: newBalance,
        },
      }),
    ]);

    return { success: true, newBalance: newBalance.toString() };
  }

  /**
   * Get all cards (admin)
   */
  static async getAllCards() {
    return prisma.card.findMany({ include: { owner: { select: { email: true, username: true } } } });
  }
}