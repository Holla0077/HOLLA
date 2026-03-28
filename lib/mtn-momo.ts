/**
 * MTN Mobile Money (MoMo) API client — Ghana Production
 *
 * Products used:
 *   - Collections (Payments V1): charge a customer's MoMo wallet → funds arrive in your merchant account
 *   - Disbursements (MoMo Withdrawals V1): push funds from your merchant account → customer's MoMo wallet
 *
 * Docs: https://momodeveloper.mtn.com/docs
 *
 * To add a new network (Telecel, AT) later, create a separate service instance
 * pointing at their API — the interface and flow are identical.
 */

import { v4 as uuidv4 } from "uuid";

const BASE_URL = process.env.MTN_MOMO_BASE_URL || "https://proxy.momoapi.mtn.com";
const TARGET_ENV = process.env.MTN_MOMO_ENV || "mtnghana";
const CONSUMER_KEY = process.env.MTN_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MTN_CONSUMER_SECRET || "";
const COLLECTION_KEY = process.env.MTN_COLLECTION_KEY || "";
const DISBURSEMENT_KEY = process.env.MTN_DISBURSEMENT_KEY || "";

// MTN uses GHS amounts as full decimal strings (e.g. "10.00"), not minor units
function pesewasToGhs(pesewas: bigint): string {
  const n = Number(pesewas);
  return (n / 100).toFixed(2);
}

// ----- Token helpers -----

async function getCollectionToken(): Promise<string> {
  const creds = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Ocp-Apim-Subscription-Key": COLLECTION_KEY,
      "X-Target-Environment": TARGET_ENV,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MTN Collection token error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function getDisbursementToken(): Promise<string> {
  const creds = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/disbursement/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Ocp-Apim-Subscription-Key": DISBURSEMENT_KEY,
      "X-Target-Environment": TARGET_ENV,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MTN Disbursement token error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

// ----- Collections (Topup / Deposit) -----

export type RequestToPayResult = {
  referenceId: string; // UUID we generate — used to poll status
};

/**
 * Request To Pay — charge the customer's MoMo wallet.
 * MTN sends a USSD push to the customer's phone asking them to approve.
 * @param phone    Customer's phone number in international format e.g. "233244123456"
 * @param amountPesewas  Amount in pesewas (integer)
 * @param payerMessage  Short message shown on customer's phone
 */
export async function requestToPay(
  phone: string,
  amountPesewas: bigint,
  payerMessage = "Holla top-up",
  callbackUrl?: string
): Promise<RequestToPayResult> {
  const token = await getCollectionToken();
  const referenceId = uuidv4();
  const amount = pesewasToGhs(amountPesewas);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Reference-Id": referenceId,
    "X-Target-Environment": TARGET_ENV,
    "Ocp-Apim-Subscription-Key": COLLECTION_KEY,
    "Content-Type": "application/json",
  };
  if (callbackUrl) headers["X-Callback-Url"] = callbackUrl;

  const body = {
    amount,
    currency: "GHS",
    externalId: referenceId,
    payer: {
      partyIdType: "MSISDN",
      partyId: normalizePhone(phone),
    },
    payerMessage,
    payeeNote: "Holla wallet top-up",
  };

  const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status !== 202) {
    const errText = await res.text();
    throw new Error(`MTN requestToPay failed (${res.status}): ${errText}`);
  }

  return { referenceId };
}

export type MoMoPaymentStatus = {
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  reason?: string;
  financialTransactionId?: string;
};

/**
 * Poll the status of a requestToPay call.
 */
export async function getCollectionStatus(referenceId: string): Promise<MoMoPaymentStatus> {
  const token = await getCollectionToken();
  const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Target-Environment": TARGET_ENV,
      "Ocp-Apim-Subscription-Key": COLLECTION_KEY,
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MTN getCollectionStatus failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return {
    status: mapStatus(data.status),
    reason: data.reason,
    financialTransactionId: data.financialTransactionId,
  };
}

// ----- Disbursements (Withdraw / Cash-out) -----

/**
 * Transfer funds from merchant account to the customer's MoMo wallet.
 */
export async function transfer(
  phone: string,
  amountPesewas: bigint,
  payeeNote = "Holla withdrawal",
  callbackUrl?: string
): Promise<{ referenceId: string }> {
  const token = await getDisbursementToken();
  const referenceId = uuidv4();
  const amount = pesewasToGhs(amountPesewas);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Reference-Id": referenceId,
    "X-Target-Environment": TARGET_ENV,
    "Ocp-Apim-Subscription-Key": DISBURSEMENT_KEY,
    "Content-Type": "application/json",
  };
  if (callbackUrl) headers["X-Callback-Url"] = callbackUrl;

  const body = {
    amount,
    currency: "GHS",
    externalId: referenceId,
    payee: {
      partyIdType: "MSISDN",
      partyId: normalizePhone(phone),
    },
    payerMessage: payeeNote,
    payeeNote,
  };

  const res = await fetch(`${BASE_URL}/disbursement/v1_0/transfer`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status !== 202) {
    const errText = await res.text();
    throw new Error(`MTN transfer failed (${res.status}): ${errText}`);
  }

  return { referenceId };
}

/**
 * Poll the status of a disbursement transfer.
 */
export async function getDisbursementStatus(referenceId: string): Promise<MoMoPaymentStatus> {
  const token = await getDisbursementToken();
  const res = await fetch(`${BASE_URL}/disbursement/v1_0/transfer/${referenceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Target-Environment": TARGET_ENV,
      "Ocp-Apim-Subscription-Key": DISBURSEMENT_KEY,
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MTN getDisbursementStatus failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return {
    status: mapStatus(data.status),
    reason: data.reason,
    financialTransactionId: data.financialTransactionId,
  };
}

// ----- Utilities -----

/**
 * Normalize a Ghanaian phone number to international MSISDN format (no +).
 * Accepts: 024xxxxxxx, 0244xxxxxxx, +233244xxxxxxx, 233244xxxxxxx
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return "233" + digits.slice(1);
  return digits;
}

function mapStatus(raw: string | undefined): "PENDING" | "SUCCESSFUL" | "FAILED" {
  if (!raw) return "PENDING";
  const s = raw.toUpperCase();
  if (s === "SUCCESSFUL") return "SUCCESSFUL";
  if (s === "FAILED") return "FAILED";
  return "PENDING";
}
