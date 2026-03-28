# KashBoy — Digital Wallet App

## Overview
A Next.js 16 fintech app (KashBoy brand) for Ghana: digital wallets (GHS fiat + crypto), MoMo and Visa/card funding and withdrawal, Bitcoin deposits, internal Holla-to-Holla transfers, activity log, support chat, user settings, and KYC identity verification. Blue-black `#070B1A` background with emerald accent theme.

## Architecture
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT-based sessions stored in `holla_session` HTTP-only cookie
- **Admin auth**: Separate `holla_admin_session` cookie with admin JWT
- **Styling**: Tailwind CSS v4

## Key Structure
- `app/` — Next.js App Router pages and API routes
  - `app/api/` — Server-side API routes:
    - `login` / `logout` / `signup` — Auth
    - `me` — Profile GET + PATCH (fullName, username, gender, dob, verificationStatus)
    - `me/password` — Change password (POST)
    - `me/phones` — Update primary phone (POST)
    - `me/kyc` — Submit Ghana Card images for KYC (GET status, POST front+back upload)
    - `kyc-image/[userId]/[filename]` — Admin-only secure KYC image serving
    - `wallets` — List user wallets (GET)
    - `transactions` — List transactions (GET) + Holla-to-Holla send (POST, atomic)
    - `topup/momo` — MoMo deposit (POST); polls via `topup/momo/status`
    - `topup/card` — Visa/card deposit (POST)
    - `withdraw/momo` — MoMo withdrawal (POST); polls via `withdraw/momo/status`; auto-refund on fail
    - `withdraw/card` — Visa/card withdrawal (POST)
    - `crypto/btc/address` — GET user's BTC deposit address (generates if missing)
    - `crypto/btc/sync-deposits` — POST: polls Blockstream API, credits wallet on confirm
    - `support/conversations` + `support/messages` — Support chat
    - `admin/users` — List users (GET), toggle verify (PATCH)
    - `admin/users/[id]` — Full user profile + wallets + transactions (GET)
    - `admin/kyc` — KYC queue (GET), approve/reject (PATCH) + sends email to user
    - `admin/support` / `admin/support/reply` — Support management
    - `admin/impersonate` — Start admin impersonation session (POST)
    - `admin/exit-impersonate` — End impersonation, return to admin (POST)
    - `admin/audit` — Audit log (GET)
  - `app/app/` — Authenticated app pages (home, activity, send-receive/cash, settings, help)
  - `app/login/`, `app/signup/` — Auth pages
  - `app/admin/` — Admin panel (login + dashboard)
- `lib/` — Shared server utilities
  - `auth.ts` — JWT sign/verify, SessionTokenPayload
  - `session.ts` — `getSessionUser()` helper
  - `admin-auth.ts` — Admin JWT sign/verify, `getAdminSession()`
  - `audit.ts` — `auditLog(action, targetUserId, meta)` helper
  - `prisma.ts` — Prisma client singleton
  - `bootstrap.ts` — Core asset and wallet creation on signup
  - `bitcoin.ts` — BIP32/BIP44 HD wallet: address derivation + Blockstream API helpers
  - `email.ts` — Resend-powered email: transaction receipts, KYC notifications, security alerts
  - `mtn-momo.ts` — MTN Mobile Money SDK wrapper (collections + disbursements)
- `kyc-uploads/` — KYC document storage (outside public dir; served via API only)
- `prisma/` — Database schema and migrations

## Cookie Names
- User session: `holla_session`
- Admin session: `holla_admin_session`

## KYC / Verification Flow
1. User clicks "Get Verified" in Settings → modal opens
2. User uploads Ghana Card front + back (images stored in `kyc-uploads/{userId}/`)
3. User.verificationStatus → PENDING, KycDocument record created
4. Admin reviews in `/admin/dashboard` → Verification tab
5. Admin approves → isVerified=true, verificationStatus=APPROVED → email sent automatically
6. Admin rejects → verificationStatus=REJECTED → email sent with admin note
7. Home page shows yellow banner (unverified/rejected) or blue banner (pending review)
8. Tab visibility change triggers re-poll so banner disappears immediately after approval

## Bitcoin Deposit Flow (BIP32/BIP44)
1. User selects BTC wallet in Crypto mode → clicks "DEPOSIT BTC"
2. Modal calls `GET /api/crypto/btc/address` → derives unique address per user (m/44'/1'/0'/0/{index} on testnet, m/44'/0'/0'/0/{index} on mainnet)
3. User copies address and sends BTC from any wallet/exchange
4. User clicks "Check for Deposits" → `POST /api/crypto/btc/sync-deposits`
5. App queries Blockstream.info API for UTXOs on the address
6. On 1+ confirmation: credits BTC wallet atomically + creates Transaction + LedgerEntry
7. Receipt email sent via Resend
- Address is deterministic and permanent — same address every session
- Architecture supports future coins (ETH, USDT etc.) with same CryptoAddress/CryptoDeposit tables

## Email Notifications (lib/email.ts)
Powered by Resend (RESEND_API_KEY). Sends branded KashBoy HTML emails for:
- Transaction receipts: topup, withdraw, transfer sent/received, BTC deposit
- KYC verification: approved or rejected (with admin note)
- Security alerts: login, password change etc.
Falls back to console.log if RESEND_API_KEY is not set (local dev).

## Admin Panel
- URL: `/admin` (login), `/admin/dashboard` (dashboard)
- Tabs: Users | Verification | Support | Audit Log
- Click any user row → opens detail slide panel
- Impersonation: admin impersonates users via orange banner
- All KYC approvals and rejections fire email to the user automatically
- All admin actions are audit-logged

## Verification Gating
`topup/momo`, `withdraw/momo`, and `transactions` POST all require:
- `user.isVerified === true`
- `user.fullName` is set

## MTN MoMo Integration
- **Service**: `lib/mtn-momo.ts`
- **Collections**: POST → PENDING + referenceId → frontend polls status every 5s → SUCCESSFUL: credit wallet + email receipt
- **Disbursements**: POST → deduct balance → poll → FAILED: auto-refund + email receipt
- **Non-MTN** (Telecel, AT Money): credited/debited instantly
- **Sandbox**: uses EUR currency; production uses GHS
- **Phone normalization**: any Ghanaian format → MSISDN (233XXXXXXXXX)

## Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `ADMIN_PASSWORD` — Admin panel password
- `MTN_CONSUMER_KEY` — MTN API user UUID
- `MTN_CONSUMER_SECRET` — MTN API user secret
- `MTN_COLLECTION_KEY` — Collections subscription key
- `MTN_DISBURSEMENT_KEY` — Disbursements subscription key
- `MTN_MOMO_BASE_URL` — MTN API base URL
- `MTN_MOMO_ENV` — MTN target environment (sandbox / mtn-gh)
- `BTC_MASTER_SEED` — 64-byte hex BIP32 master seed (⚠️ never change after users onboard)
- `BTC_NETWORK` — "testnet" or "mainnet" (default: testnet)
- `RESEND_API_KEY` — Resend email API key
- `EMAIL_FROM` — From address for emails (default: KashBoy <noreply@kashboy.com>)
- `NEXT_PUBLIC_APP_URL` — Public app URL (https://kashboy.com in production)

## Domain Preparation (kashboy.com)
See `DEPLOYMENT.md` for full instructions. Summary:
- App is standard Next.js — runs on Vercel, Railway, Render, Fly.io, or any VPS
- Set `NEXT_PUBLIC_APP_URL=https://kashboy.com` in production
- Add `kashboy.com` domain in Resend dashboard for email delivery
- MTN MoMo: switch `MTN_MOMO_ENV=mtn-gh` and `MTN_MOMO_BASE_URL=https://proxy.momoapi.mtn.com`
- BTC: switch `BTC_NETWORK=mainnet` (keep same BTC_MASTER_SEED)

## Running on Replit
- Dev server: `npm run dev` (port 5000, bound to 0.0.0.0)
- The workflow "Start application" runs `npm run dev` automatically

## Database
- Migrations: `prisma/migrations/`
- After schema changes: `npx prisma migrate dev --name <description>`
- Apply migrations: `npx prisma migrate deploy`
- Key models: User, Wallet, Asset, Transaction, CryptoAddress, CryptoDeposit, SupportConversation, SupportMessage, KycDocument, AdminAuditLog

## Security Notes
- JWT_SECRET and BTC_MASTER_SEED must be stored in secrets — never in code
- Session cookies are HTTP-only
- KYC images served via admin-only API route (not publicly accessible)
- Impersonation is time-limited (2h) and audit-logged
- BTC_MASTER_SEED: generate once, back up offline — loss = permanent address loss
