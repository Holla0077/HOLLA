import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/src/shared/guards/auth.guard';
import { MerchantService } from '@/src/domains/ledger/services/entry-builder';

export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN');
    const { userId, businessName, category, phone, email } = await req.json();
    if (!userId || !businessName) return NextResponse.json({ error: 'userId and businessName required' }, { status: 400 });
    const merchant = await MerchantService.createMerchant(userId, businessName, category, phone, email);
    return NextResponse.json({ success: true, merchant }, { status: 201 });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to create merchant';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireRole('ADMIN', 'FINANCE');
    const merchants = await MerchantService.getAllMerchants();
    return NextResponse.json({ merchants });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to list merchants';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}