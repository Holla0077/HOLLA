# Holla - Digital Wallet App

## Overview
A Next.js 16 fintech app (KashBoy brand) for Ghana: digital wallets (GHS fiat + crypto), MoMo and Visa/card funding and withdrawal, internal Holla-to-Holla transfers, activity log, support chat, user settings, and KYC identity verification. Blue-black `#070B1A` background with emerald accent theme.

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
    - `kyc-image/[userId]/[filename]` — Admin-only secure KYC image serving (outside public dir)
    - `wallets` — List user wallets (GET)
    - `transactions` — List transactions (GET) + Holla-to-Holla send (POST, atomic)
    - `topup/momo` — MoMo deposit (POST) — credits wallet immediately, requires `isVerified=true`
    - `topup/card` — Visa/card deposit (POST) — credits wallet immediately, requires `isVerified=true`
    - `withdraw/momo` — MoMo withdrawal (POST) — atomic balance deduct, requires `isVerified=true`
    - `withdraw/card` — Visa/card withdrawal (POST) — atomic balance deduct, requires `isVerified=true`
    - `support/conversations` + `support/messages` — Support chat
    - `admin/users` — List users (GET), toggle verify (PATCH)
    - `admin/users/[id]` — Full user profile + wallets + transactions (GET)
    - `admin/kyc` — KYC queue (GET), approve/reject (PATCH)
    - `admin/support` / `admin/support/reply` — Support management
    - `admin/impersonate` — Start admin impersonation session (POST)
    - `admin/exit-impersonate` — End impersonation, return to admin (POST)
    - `admin/audit` — Audit log (GET)
  - `app/app/` — Authenticated app pages (home, activity, send-receive/cash, settings, help)
  - `app/login/`, `app/signup/` — Auth pages
  - `app/admin/` — Admin panel (login + dashboard)
- `lib/` — Shared server utilities
  - `auth.ts` — JWT sign/verify, SessionTokenPayload (includes `impersonated` flag)
  - `session.ts` — `getSessionUser()` helper (id + impersonated flag)
  - `admin-auth.ts` — Admin JWT sign/verify, `getAdminSession()`
  - `audit.ts` — `auditLog(action, targetUserId, meta)` helper
  - `prisma.ts` — Prisma client singleton
  - `bootstrap.ts` — Core asset and wallet creation on signup
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
5. Admin approves → isVerified=true, verificationStatus=APPROVED
6. Admin rejects → verificationStatus=REJECTED (user can resubmit)
7. Home page shows yellow banner (unverified/rejected) or blue banner (pending review)
8. Settings page shows status-contextual banner + "Get Verified" / "Submitted" button

## Admin Panel
- URL: `/admin` (login), `/admin/dashboard` (dashboard)
- Tabs: Users | Verification | Support | Audit Log
- Click any user row → opens detail slide panel (wallets, txns, "Act as" impersonation)
- Impersonation: admin POSTs to `/api/admin/impersonate` → sets holla_session cookie with `impersonated: true`
- Orange banner shown in app layout when impersonating, with Exit button
- All KYC approvals, rejections, and impersonation actions are audit-logged

## Verification Gating
`topup/momo`, `withdraw/momo`, and `transactions` POST all require:
- `user.isVerified === true`
- `user.fullName` is set

Users see a clear error directing them to Settings if not verified.

## MTN MoMo Integration
- **Service**: `lib/mtn-momo.ts` — all MTN API calls live here (collections + disbursements)
- **Collections (Deposits)**: `POST /api/topup/momo` → sends USSD push to customer → returns PENDING + referenceId → frontend polls `/api/topup/momo/status?ref=<referenceId>` every 5s → on SUCCESSFUL: credits wallet atomically
- **Disbursements (Withdrawals)**: `POST /api/withdraw/momo` → deducts balance → calls MTN transfer → frontend polls `/api/withdraw/momo/status?ref=<referenceId>` → on FAILED: refunds balance automatically
- **Non-MTN networks** (Telecel, AT Money): credited/debited instantly until their APIs are integrated (same modular pattern)
- **Phone normalization**: `normalizePhone()` converts any Ghanaian format to MSISDN (233XXXXXXXXX)
- **Adding a new network**: Create a new service in `lib/<network>-momo.ts` following the same interface (`requestToPay`, `transfer`, `getCollectionStatus`, `getDisbursementStatus`). Update `networkToMethod()` in the routes.

## Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (set automatically by Replit)
- `JWT_SECRET` — Secret key for signing JWT tokens (set in Replit Secrets)
- `ADMIN_PASSWORD` — Admin panel password (set in Replit Secrets)
- `MTN_CONSUMER_KEY` — MTN Developer Portal app Consumer Key
- `MTN_CONSUMER_SECRET` — MTN Developer Portal app Consumer Secret
- `MTN_COLLECTION_KEY` — Subscription key for "Payments V1" product
- `MTN_DISBURSEMENT_KEY` — Subscription key for "MoMo Withdrawals V1" product
- `MTN_MOMO_BASE_URL` — MTN API base URL (default: https://proxy.momoapi.mtn.com)
- `MTN_MOMO_ENV` — MTN target environment (default: mtnghana)

## Running on Replit
- Dev server: `npm run dev` (port 5000, bound to 0.0.0.0)
- The workflow "Start application" runs `npm run dev` automatically

## Database
- Migrations are in `prisma/migrations/`
- After code changes: `npx prisma generate` (already done)
- To apply new migrations: `npx prisma migrate deploy`
- Key models: User, Wallet, Asset, Transaction, SupportConversation, SupportMessage, KycDocument, AdminAuditLog

## Security Notes
- JWT_SECRET defaults to a hardcoded value — set a strong secret in Secrets
- Session cookies are HTTP-only, read server-side only
- KYC images served via admin-only API route (not publicly accessible)
- Impersonation is time-limited (2h) and audit-logged
- All admin actions go through `getAdminSession()` check

## BUZ POS (Separate Project)
A separate Nightclub POS system that was accidentally merged into this workspace is now isolated under `/buzpos/`. It is self-contained and can be moved into its own Replit project. It has no connection to the HOLLA codebase. Do not import from or modify `/buzpos/` when working on HOLLA.
