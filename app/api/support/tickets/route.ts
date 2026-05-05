import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/domains/auth/services/auth.service';
import { requireRole } from '@/src/shared/guards/auth.guard';
import { SupportService } from '@/src/domains/support/services/support.service';

export async function POST(req: NextRequest) {
  try {
    const user = await AuthService.getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { subject, message } = await req.json();
    if (!subject || !message) return NextResponse.json({ error: 'Subject and message required' }, { status: 400 });
    const ticket = await SupportService.createTicket(user.id, subject, message);
    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to create ticket';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'SUPPORT');
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as any;
    const assignedTo = url.searchParams.get('assignedTo') || undefined;
    const tickets = await SupportService.getAllTickets({ status, assignedTo });
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to list tickets';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}