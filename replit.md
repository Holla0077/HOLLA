# Holla - Digital Wallet App

## Overview
A Next.js 16 fintech app (KashBoy brand) for Ghana: digital wallets (GHS fiat + crypto), MoMo and Visa/card funding and withdrawal, internal Holla-to-Holla transfers, activity log, support chat, and user settings. Blue-black `#070B1A` background with emerald accent theme.

## Architecture
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT-based sessions stored in `holla_session` HTTP-only cookie
- **Styling**: Tailwind CSS v4

## Key Structure
- `app/` — Next.js App Router pages and API routes
  - `app/api/` — Server-side API routes:
    - `login` / `logout` / `signup` — Auth
    - `me` — Profile GET + PATCH (fullName, username, gender, dob)
    - `me/password` — Change password (POST)
    - `me/phones` — Update primary phone (POST)
    - `me/verify-request` — Verification request (POST)
    - `wallets` — List user wallets (GET)
    - `transactions` — List transactions (GET) + Holla-to-Holla send (POST, atomic)
    - `topup/momo` — MoMo deposit (POST) — credits wallet immediately, requires `isVerified=true`
    - `topup/card` — Visa/card deposit (POST) — credits wallet immediately, requires `isVerified=true`
    - `withdraw/momo` — MoMo withdrawal (POST) — atomic balance deduct, requires `isVerified=true`
    - `withdraw/card` — Visa/card withdrawal (POST) — atomic balance deduct, requires `isVerified=true`
    - `support/conversations` + `support/messages` — Support chat
  - `app/app/` — Authenticated app pages (home, activity, send-receive/cash, settings, help)
  - `app/login/`, `app/signup/` — Auth pages
- `lib/` — Shared server utilities
  - `auth.ts` — JWT sign/verify, `getAuthedUserId`
  - `auth.server.ts` — Server-only cookie reader (uses `holla_session` cookie)
  - `session.ts` — `getSessionUser()` helper (uses `holla_session` cookie)
  - `prisma.ts` — Prisma client singleton
  - `bootstrap.ts` — Core asset and wallet creation on signup
- `prisma/` — Database schema and migrations

## Cookie Name
All auth uses cookie: `holla_session`

## Verification Gating
`topup/momo`, `withdraw/momo`, and `transactions` POST all require:
- `user.isVerified === true`
- `user.fullName` is set

Users see a clear error directing them to Settings if not verified.

## Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (set automatically by Replit)
- `JWT_SECRET` — Secret key for signing JWT tokens (should be set in Secrets)

## Running on Replit
- Dev server: `npm run dev` (port 5000, bound to 0.0.0.0)
- The workflow "Start application" runs `npm run dev` automatically

## Database
- Migrations are in `prisma/migrations/`
- After code changes: `npx prisma generate` (already done)
- To apply new migrations: `npx prisma migrate deploy`

## Security Notes
- JWT_SECRET defaults to a hardcoded value — set a strong secret in Secrets
- Session cookies are HTTP-only, read server-side only
- Verification gating prevents unverified users from transacting

## BUZ POS (Separate Project)
A separate Nightclub POS system that was accidentally merged into this workspace is now isolated under `/buzpos/`. It is self-contained and can be moved into its own Replit project. It has no connection to the HOLLA codebase. Do not import from or modify `/buzpos/` when working on HOLLA.
