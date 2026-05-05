import { Prisma } from '@prisma/client';
import { LedgerEntryType, LedgerDirection } from './types';
import prisma from '@/lib/prisma';

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

export class MerchantService {
  // Register a new merchant (admin only)
  static async createMerchant(userId: string, businessName: string, category?: string, phone?: string, email?: string) {
    return prisma.merchant.create({
      data: { userId, businessName, category, phone, email },
    });
  }

  // List all merchants
  static async getAllMerchants() {
    return prisma.merchant.findMany({
      include: { user: { select: { email: true, username: true } } },
    });
  }

  // Create a QR payment request (merchant side)
  static async createQRPayment(merchantId: string, amount: bigint, currency = 'GHS', reference?: string) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    return prisma.qRPayment.create({
      data: { merchantId, amount, currency, reference, expiresAt },
    });
  }
  // Get pending payments for a merchant
  static async getPendingPayments(merchantId: string) {
    return prisma.qRPayment.findMany({
      where: { merchantId, status: 'PENDING' },
    });
  }

  // Mark a QR payment as paid (can be called when customer pays)
  static async markPaymentAsPaid(paymentId: string) {
    return prisma.qRPayment.update({
      where: { id: paymentId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  // Record a settlement (transfer to merchant wallet) – placeholder
  static async settlePayment(paymentId: string) {
    // In a real scenario, you'd move funds from a holding pool to the merchant's wallet.
    // For now, we just record the settlement.
    const payment = await prisma.qRPayment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status !== 'PAID') throw new Error('Payment not ready for settlement');
    return prisma.merchantSettlement.create({
      data: { merchantId: payment.merchantId, amount: payment.amount, reference: payment.reference },
    });
  }
}
