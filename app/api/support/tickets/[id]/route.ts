import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/src/domains/auth/services/auth.service';
import { requireRole } from '@/src/shared/guards/auth.guard';
import { SupportService } from '@/src/domains/support/services/support.service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await AuthService.getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ticket = await SupportService.getTicket(params.id);
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to get ticket';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole('ADMIN', 'SUPPORT');
    const { status, assignedTo } = await req.json();
    const updated = await SupportService.updateTicketStatus(params.id, status, assignedTo);
    return NextResponse.json({ success: true, ticket: updated });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await AuthService.getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });
    const msg = await SupportService.addMessage(params.id, user.id, content);
    return NextResponse.json({ success: true, message: msg }, { status: 201 });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to add message';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}