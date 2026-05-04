import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/domains/auth/services/auth.service';
import { CollectionService } from '@/src/domains/payments/momo/services/collection.service';
import { AppError } from '@/src/shared/errors/app-errors';

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getSessionUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');
    if (!ref) throw new AppError('ref parameter required', 400);

    const result = await CollectionService.checkAndCompleteTopUp(ref, user.id);
    const message = result.status === 'COMPLETED'
      ? 'Top-up completed successfully.'
      : result.status === 'FAILED'
        ? `Payment failed: ${result.reason || 'Declined'}`
        : 'Waiting for approval...';

    return NextResponse.json({ status: result.status, message });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[topup/momo/status]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}