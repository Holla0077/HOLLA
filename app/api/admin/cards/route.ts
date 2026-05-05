import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/src/shared/guards/auth.guard';
import { CardService } from '@/src/domains/cards/services/card.service';

export async function GET() {
  try {
    await requireRole('ADMIN');
    const cards = await CardService.getAllCards();
    return NextResponse.json({ cards });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to fetch cards';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN');
    const body = await req.json();
    const card = await CardService.createCard(body);
    return NextResponse.json({ success: true, card }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to create card';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}