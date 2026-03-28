/**
 * KashBoy email service — powered by Resend.
 *
 * Set RESEND_API_KEY in environment secrets.
 * All emails come from: noreply@kashboy.com  (configure in Resend dashboard).
 *
 * When RESEND_API_KEY is not set (local dev without email), emails are logged
 * to console instead of being sent so the rest of the app keeps working.
 */

import { Resend } from "resend";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM ?? "KashBoy <noreply@kashboy.com>";

// ────────────────────────────────────────────────────────────────────────────
// Base HTML template
// ────────────────────────────────────────────────────────────────────────────
function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#0a0f1e; font-family:'Helvetica Neue',Arial,sans-serif; color:#e2e8f0; }
    .wrapper { max-width:580px; margin:0 auto; padding:40px 24px; }
    .logo { font-size:28px; font-weight:900; color:#10b981; letter-spacing:-1px; margin-bottom:32px; }
    .logo span { color:#fff; }
    .card { background:#111827; border:1px solid #1f2937; border-radius:16px; padding:32px; margin-bottom:24px; }
    h1 { font-size:22px; font-weight:700; margin:0 0 12px; color:#fff; }
    p { font-size:15px; line-height:1.65; margin:0 0 16px; color:#94a3b8; }
    .highlight { color:#10b981; font-weight:700; }
    .amount { font-size:32px; font-weight:900; color:#10b981; margin:16px 0; }
    .badge { display:inline-block; padding:4px 14px; border-radius:99px; font-size:13px; font-weight:600; }
    .badge-success { background:#064e3b; color:#34d399; }
    .badge-pending { background:#1e3a5f; color:#60a5fa; }
    .badge-rejected { background:#7f1d1d; color:#fca5a5; }
    .divider { border:none; border-top:1px solid #1f2937; margin:24px 0; }
    .meta-row { display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px; }
    .meta-label { color:#6b7280; }
    .meta-value { color:#e2e8f0; font-weight:500; }
    .footer { text-align:center; font-size:12px; color:#4b5563; margin-top:32px; }
    .footer a { color:#10b981; text-decoration:none; }
    .btn { display:inline-block; background:#10b981; color:#000; font-weight:700;
           padding:12px 28px; border-radius:10px; text-decoration:none; font-size:15px; margin-top:8px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">KASH<span>BOY</span></div>
    ${body}
    <div class="footer">
      <p>© ${new Date().getFullYear()} KashBoy · Ghana's Smart Money App · <a href="https://kashboy.com">kashboy.com</a></p>
      <p style="margin-top:4px">This email was sent to you because you have a KashBoy account.</p>
    </div>
  </div>
</body>
</html>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Send helper
// ────────────────────────────────────────────────────────────────────────────
async function send(to: string, subject: string, html: string, text: string) {
  const resend = getResend();
  if (!resend) {
    console.log(`[Email] (no RESEND_API_KEY) To: ${to} | Subject: ${subject}`);
    console.log(`[Email] ${text}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html, text });
  } catch (err) {
    console.error("[Email] Send failed:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Public email functions
// ────────────────────────────────────────────────────────────────────────────

/** Send a transaction receipt email. */
export async function sendTransactionEmail(opts: {
  to: string;
  username: string;
  type: "topup" | "withdraw" | "transfer_sent" | "transfer_received" | "crypto_deposit";
  amount: string;       // e.g. "GH₵ 50.00" or "0.001 BTC"
  reference?: string;
  method?: string;      // e.g. "MTN MoMo", "Bitcoin"
  note?: string;
}) {
  const { to, username, type, amount, reference, method, note } = opts;

  const typeLabels: Record<string, { title: string; verb: string; badge: string }> = {
    topup:               { title: "Wallet Funded",          verb: "credited to",  badge: "badge-success" },
    withdraw:            { title: "Withdrawal Sent",        verb: "withdrawn from", badge: "badge-pending" },
    transfer_sent:       { title: "Transfer Sent",          verb: "sent from",    badge: "badge-pending" },
    transfer_received:   { title: "Transfer Received",      verb: "received in",  badge: "badge-success" },
    crypto_deposit:      { title: "Bitcoin Deposit Detected", verb: "credited to", badge: "badge-success" },
  };

  const { title, verb, badge } = typeLabels[type];
  const subject = `${title} — ${amount}`;
  const now = new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra" });

  const body = `
<div class="card">
  <h1>${title}</h1>
  <p>Hi <strong>${username}</strong>,</p>
  <p><strong class="amount">${amount}</strong> was ${verb} your wallet.</p>
  <span class="badge ${badge}">Completed</span>
  <hr class="divider" />
  ${method ? `<div class="meta-row"><span class="meta-label">Method</span><span class="meta-value">${method}</span></div>` : ""}
  ${reference ? `<div class="meta-row"><span class="meta-label">Reference</span><span class="meta-value" style="font-family:monospace;font-size:12px">${reference}</span></div>` : ""}
  <div class="meta-row"><span class="meta-label">Date</span><span class="meta-value">${now} (GMT+0)</span></div>
  ${note ? `<p style="margin-top:16px;font-size:13px">${note}</p>` : ""}
</div>
<p style="text-align:center"><a class="btn" href="https://kashboy.com/app/home">View Dashboard</a></p>`;

  const text = `${title}\n\nHi ${username},\n${amount} was ${verb} your wallet.\nMethod: ${method ?? "—"}\nRef: ${reference ?? "—"}\nDate: ${now}\n\nKashBoy — kashboy.com`;

  await send(to, subject, baseTemplate(title, body), text);
}

/** Send verification status email (approved or rejected). */
export async function sendVerificationStatusEmail(opts: {
  to: string;
  username: string;
  status: "APPROVED" | "REJECTED";
  adminNote?: string;
}) {
  const { to, username, status, adminNote } = opts;
  const approved = status === "APPROVED";
  const subject = approved
    ? "Identity Verified — You're fully unlocked!"
    : "Identity Verification Update";

  const body = approved
    ? `<div class="card">
        <h1>🎉 Identity Verified</h1>
        <p>Hi <strong>${username}</strong>,</p>
        <p>Your Ghana Card has been verified. You now have <span class="highlight">full access</span> to all KashBoy features including higher limits, withdrawals, and crypto.</p>
        <span class="badge badge-success">Verified</span>
      </div>
      <p style="text-align:center"><a class="btn" href="https://kashboy.com/app/home">Go to Dashboard</a></p>`
    : `<div class="card">
        <h1>Verification Update</h1>
        <p>Hi <strong>${username}</strong>,</p>
        <p>Unfortunately your identity verification could not be completed at this time.</p>
        ${adminNote ? `<p><strong>Reason:</strong> ${adminNote}</p>` : ""}
        <span class="badge badge-rejected">Not Verified</span>
        <hr class="divider" />
        <p style="font-size:13px">Please re-submit your Ghana Card documents from the Settings page. Make sure both front and back are clearly visible and not blurry.</p>
      </div>
      <p style="text-align:center"><a class="btn" href="https://kashboy.com/app/settings">Re-Submit Documents</a></p>`;

  const text = approved
    ? `Hi ${username},\n\nYour identity has been verified! You now have full access to KashBoy.\n\nKashBoy — kashboy.com`
    : `Hi ${username},\n\nYour verification was not approved. Reason: ${adminNote ?? "—"}.\n\nPlease re-submit from Settings.\n\nKashBoy — kashboy.com`;

  await send(to, subject, baseTemplate(subject, body), text);
}

/** Send a security alert (new login, password change, etc). */
export async function sendSecurityAlertEmail(opts: {
  to: string;
  username: string;
  event: string;
  detail?: string;
}) {
  const { to, username, event, detail } = opts;
  const subject = `Security Alert: ${event}`;
  const now = new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra" });

  const body = `<div class="card">
    <h1>Security Alert</h1>
    <p>Hi <strong>${username}</strong>,</p>
    <p>We detected the following activity on your KashBoy account:</p>
    <div class="meta-row"><span class="meta-label">Event</span><span class="meta-value">${event}</span></div>
    <div class="meta-row"><span class="meta-label">Time</span><span class="meta-value">${now} (GMT+0)</span></div>
    ${detail ? `<div class="meta-row"><span class="meta-label">Detail</span><span class="meta-value">${detail}</span></div>` : ""}
    <hr class="divider" />
    <p style="font-size:13px">If this wasn't you, please change your password immediately from the Settings page.</p>
  </div>
  <p style="text-align:center"><a class="btn" href="https://kashboy.com/app/settings">Review Account</a></p>`;

  const text = `Security Alert: ${event}\n\nHi ${username},\nEvent: ${event}\nTime: ${now}\n${detail ? `Detail: ${detail}\n` : ""}If this wasn't you, change your password immediately.\n\nKashBoy — kashboy.com`;

  await send(to, subject, baseTemplate(subject, body), text);
}
