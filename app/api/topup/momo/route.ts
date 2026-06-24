import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/domains/auth/services/auth.service';
import { CollectionService } from '@/src/domains/payments/momo/services/collection.service';
import { AppError } from '@/src/shared/errors/app-errors';

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getSessionUser(req);
    if (!user) throw new AppError('Unauthorized', 401);

    const body = await req.json();
    const { walletId, amount, phone, network } = body;

    if (!walletId || !amount || !phone || !network) {
      throw new AppError('walletId, amount, phone, network required', 400);
    }

    const result = await CollectionService.requestTopUp({
      userId: user.id,
      walletId,
      amountGhs: amount,
      phone,
      network,
    });

    return NextResponse.json({
  ok: true,
  ...result,
  message: result.status === 'PENDING'
    ? 'A payment request has been sent to your MTN MoMo number. Please approve it on your phone.'
    : `Top-up of GH₵ ${(Number(amount) / 100).toFixed(2)} successful.`,  // use `amount` from input
});
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[topup/momo]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
