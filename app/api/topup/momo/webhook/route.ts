import { NextRequest, NextResponse } from 'next/server';
import { CollectionService } from '@/src/domains/payments/momo/services/collection.service';

export const runtime = 'nodejs';

type WebhookPayload = Record<string, unknown>;

async function readWebhookPayload(req: NextRequest): Promise<WebhookPayload> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? body as WebhookPayload : {};
  } catch {
    return {};
  }
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function extractReferenceId(req: NextRequest, payload: WebhookPayload) {
  const { searchParams } = new URL(req.url);
  return (
    searchParams.get('ref') ||
    searchParams.get('referenceId') ||
    searchParams.get('externalId') ||
    getString(payload.externalId) ||
    getString(payload.referenceId)
  );
}

function isWebhookAuthorized(req: NextRequest, payload: WebhookPayload) {
  const expectedSecret = process.env.MTN_COLLECTION_WEBHOOK_SECRET;
  if (!expectedSecret) return true;

  const { searchParams } = new URL(req.url);
  const providedSecret =
    req.headers.get('x-kashboy-webhook-secret') ||
    searchParams.get('token') ||
    getString(payload.token);

  return providedSecret === expectedSecret;
}

export async function POST(req: NextRequest) {
  const payload = await readWebhookPayload(req);

  if (!isWebhookAuthorized(req, payload)) {
    console.warn('[topup/momo/webhook] unauthorized callback');
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const referenceId = extractReferenceId(req, payload);
  if (!referenceId) {
    console.warn('[topup/momo/webhook] missing reference id');
    return NextResponse.json({ ok: false, error: 'Missing reference id' }, { status: 400 });
  }

  try {
    const result = await CollectionService.handleCollectionWebhook(referenceId);
    const transactionId = 'transactionId' in result ? result.transactionId : undefined;
    const alreadyProcessed = 'alreadyProcessed' in result ? result.alreadyProcessed : false;
    console.info('[topup/momo/webhook] processed callback', {
      referenceId,
      status: result.status,
      alreadyProcessed,
    });

    return NextResponse.json({
      ok: true,
      referenceId,
      status: result.status,
      transactionId,
      alreadyProcessed,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Topup request not found') {
      console.warn('[topup/momo/webhook] topup request not found', { referenceId });
      return NextResponse.json({ ok: false, error: 'Topup request not found' }, { status: 404 });
    }

    console.error('[topup/momo/webhook]', {
      referenceId,
      error: error instanceof Error ? error.message : 'Webhook processing failed',
    });
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
