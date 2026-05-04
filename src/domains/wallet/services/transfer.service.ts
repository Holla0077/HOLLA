import prisma from '@/src/shared/database/prisma';
import { LedgerService } from '@/src/domains/ledger/services/ledger.service';
import { NotFoundError, ValidationError } from '@/src/shared/errors/app-errors';

export class TransferService {
  static async internalTransfer(params: {
    senderId: string;
    recipientIdentifier: string;
    assetCode: string;
    amount: number; // human amount (e.g. GHS 50, BTC 0.01)
  }) {
    const { senderId, recipientIdentifier, assetCode, amount } = params;

    const asset = await prisma.asset.findUnique({ where: { code: assetCode } });
    if (!asset) throw new NotFoundError('Asset');

    // Determine minor unit multiplier (FIAT -> 100, CRYPTO -> 1e8)
    const multiplier = asset.type === 'FIAT' ? 100n : 100_000_000n;
    const amountMinor = BigInt(Math.round(amount * Number(multiplier)));

    if (amountMinor <= 0n) throw new ValidationError('Amount must be positive');

    // Sender and recipient wallets
    const fromWallet = await prisma.wallet.findUnique({
      where: { userId_assetId: { userId: senderId, assetId: asset.id } },
    });
    if (!fromWallet) throw new NotFoundError('Your ' + assetCode + ' wallet');

    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { email: recipientIdentifier },
          { username: recipientIdentifier },
          { phone: recipientIdentifier },
        ],
        NOT: { id: senderId },
      },
    });
    if (!recipient) throw new NotFoundError('Recipient');

    const toWallet = await prisma.wallet.findUnique({
      where: { userId_assetId: { userId: recipient.id, assetId: asset.id } },
    });
    if (!toWallet) throw new NotFoundError('Recipient ' + assetCode + ' wallet');

    // Execute transfer inside transaction
    return await prisma.$transaction(async (tx) => {
      // Debit sender
      await LedgerService.createEntry(tx, {
        userId: senderId,
        walletId: fromWallet.id,
        assetId: asset.id,
        amount: amountMinor,
        type: 'TRANSFER_OUT',
        direction: 'DEBIT',
        reference: `p2p_${Date.now()}`,
        metadata: { toUserId: recipient.id, recipientIdentifier },
        lastBalance: fromWallet.balance,
      });

      // Credit recipient
      await LedgerService.createEntry(tx, {
        userId: recipient.id,
        walletId: toWallet.id,
        assetId: asset.id,
        amount: amountMinor,
        type: 'TRANSFER_IN',
        direction: 'CREDIT',
        reference: `p2p_${Date.now()}`,
        metadata: { fromUserId: senderId, senderIdentifier: senderId },
        lastBalance: toWallet.balance,
      });

      // Legacy transaction record (optional, for existing UI compatibility)
      const txRecord = await tx.transaction.create({
        data: {
          userId: senderId,
          assetId: asset.id,
          rail: 'HOLLA_INTERNAL',
          method: 'HOLLA_TO_HOLLA',
          status: 'COMPLETED',
          amount: amountMinor,
          feeTotal: 0n,
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          metadata: { recipientId: recipient.id, recipientIdentifier },
        },
      });

      return { transactionId: txRecord.id };
    });
  }
}