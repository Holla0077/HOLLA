import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/src/shared/database/prisma';
import { LedgerService } from '@/src/domains/ledger/services/ledger.service';
import { UnauthorizedError, InsufficientFundsError, AppError } from '@/src/shared/errors/app-errors';
import { requireRole } from '@/src/shared/guards/auth.guard';

// Must be set in .env: ADMIN_API_KEY
const expectedKey = process.env.ADMIN_API_KEY!;
if (!expectedKey) throw new Error('ADMIN_API_KEY not set');

async function getBtcToGhsRate(): Promise<number> {
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=ghs');
  const data = await res.json();
  return data.bitcoin.ghs;
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const apiKey = req.headers.get('x-admin-api-key');
    if (apiKey !== expectedKey) {
      await requireRole('ADMIN', 'FINANCE');
    }

    const { userId, btcSatoshis, customRate } = await req.json();
    if (!userId || !btcSatoshis || btcSatoshis <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const btcAsset = await prisma.asset.findUnique({ where: { code: 'BTC' } });
    const ghsAsset = await prisma.asset.findUnique({ where: { code: 'GHS' } });
    if (!btcAsset || !ghsAsset) {
      return NextResponse.json({ error: 'Assets not found' }, { status: 500 });
    }

    const btcWallet = await prisma.wallet.findFirst({ where: { userId, assetId: btcAsset.id } });
    const ghsWallet = await prisma.wallet.findFirst({ where: { userId, assetId: ghsAsset.id } });
    if (!btcWallet || !ghsWallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (btcWallet.balance < BigInt(btcSatoshis)) {
      throw new InsufficientFundsError('BTC');
    }

    const rate = customRate || await getBtcToGhsRate();
    const ghsPesewas = BigInt(Math.round((btcSatoshis / 100_000_000) * rate * 100));

    // Execute conversion inside a transaction
    await prisma.$transaction(async (tx) => {
      // Debit BTC
      await LedgerService.createEntry(tx, {
        userId,
        walletId: btcWallet.id,
        assetId: btcAsset.id,
        amount: BigInt(btcSatoshis),
        type: 'CONVERSION',
        direction: 'DEBIT',
        reference: `conv_${Date.now()}`,
        metadata: { rate, ghsPesewas: ghsPesewas.toString() },
        lastBalance: btcWallet.balance,
      });

      // Credit GHS
      await LedgerService.createEntry(tx, {
        userId,
        walletId: ghsWallet.id,
        assetId: ghsAsset.id,
        amount: ghsPesewas,
        type: 'CONVERSION',
        direction: 'CREDIT',
        reference: `conv_${Date.now()}`,
        metadata: { rate, btcSatoshis },
        lastBalance: ghsWallet.balance,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}