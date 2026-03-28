/**
 * MTN Mobile Money (MoMo) API client — Ghana Production + Sandbox
 *
 * All env vars are read at call time (not module init) so secrets
 * updated via the Replit dashboard take effect without redeployment.
 *
 * Sandbox quirks:
 *   - BASE_URL : https://sandbox.momodeveloper.mtn.com
 *   - TARGET_ENV: sandbox
 *   - currency  : EUR  (sandbox does not support GHS)
 *   - test MSISDN: any number — use the customer's real phone
 *
 * Production (Ghana):
 *   - BASE_URL : https://proxy.momoapi.mtn.com
 *   - TARGET_ENV: mtn-gh
 *   - currency  : GHS
 */

import { v4 as uuidv4 } from "uuid";

function cfg() {
  return {
    BASE_URL: process.env.MTN_MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com",
    TARGET_ENV: process.env.MTN_MOMO_ENV || "sandbox",
    CONSUMER_KEY: process.env.MTN_CONSUMER_KEY || "",
    CONSUMER_SECRET: process.env.MTN_CONSUMER_SECRET || "",
    COLLECTION_KEY: process.env.MTN_COLLECTION_KEY || "",
    DISBURSEMENT_KEY: process.env.MTN_DISBURSEMENT_KEY || "",
  };
}

/** In sandbox the API only accepts EUR; production uses GHS */
function apiCurrency(): string {
  const env = (process.env.MTN_MOMO_ENV || "sandbox").toLowerCase();
  return env === "sandbox" ? "EUR" : "GHS";
}

function pesewasToAmount(pesewas: bigint): string {
  const n = Number(pesewas);
  return (n / 100).toFixed(2);
}

// ----- Token helpers -----

async function getCollectionToken(): Promise<string> {
  const { BASE_URL, TARGET_ENV, CONSUMER_KEY, CONSUMER_SECRET, COLLECTION_KEY } = cfg();
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
  const { BASE_URL, TARGET_ENV, CONSUMER_KEY, CONSUMER_SECRET, DISBURSEMENT_KEY } = cfg();
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
  referenceId: string;
};

export async function requestToPay(
  phone: string,
  amountPesewas: bigint,
  payerMessage = "Holla top-up",
  callbackUrl?: string
): Promise<RequestToPayResult> {
  const { BASE_URL, TARGET_ENV, COLLECTION_KEY } = cfg();
  const token = await getCollectionToken();
  const referenceId = uuidv4();
  const amount = pesewasToAmount(amountPesewas);
  const currency = apiCurrency();

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
    currency,
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

export async function getCollectionStatus(referenceId: string): Promise<MoMoPaymentStatus> {
  const { BASE_URL, TARGET_ENV, COLLECTION_KEY } = cfg();
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

export async function transfer(
  phone: string,
  amountPesewas: bigint,
  payeeNote = "Holla withdrawal",
  callbackUrl?: string
): Promise<{ referenceId: string }> {
  const { BASE_URL, TARGET_ENV, DISBURSEMENT_KEY } = cfg();
  const token = await getDisbursementToken();
  const referenceId = uuidv4();
  const amount = pesewasToAmount(amountPesewas);
  const currency = apiCurrency();

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
    currency,
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

export async function getDisbursementStatus(referenceId: string): Promise<MoMoPaymentStatus> {
  const { BASE_URL, TARGET_ENV, DISBURSEMENT_KEY } = cfg();
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
