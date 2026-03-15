# Holla - Digital Wallet App

## Overview
A Next.js 16 digital wallet application with support for fiat (GHS) and crypto assets, mobile money top-ups/withdrawals (MTN MoMo), internal transfers, and a support chat system.

## Architecture
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT-based sessions stored in HTTP-only cookies
- **Styling**: Tailwind CSS v4

## Key Structure
- `app/` — Next.js App Router pages and API routes
  - `app/api/` — Server-side API routes (login, signup, wallets, transactions, topup, withdraw, support)
  - `app/app/` — Authenticated app pages (home, activity, send-receive, settings, help)
  - `app/login/`, `app/signup/` — Auth pages
- `lib/` — Shared server utilities (auth, prisma client, session)
- `prisma/` — Database schema and migrations

## Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (required)
- `JWT_SECRET` — Secret key for signing JWT tokens (recommended, has insecure default)

## Running on Replit
- Dev server: `npm run dev` (port 5000, bound to 0.0.0.0)
- The workflow "Start application" runs `npm run dev` automatically

## Security Notes
- JWT_SECRET defaults to a hardcoded value — set a strong secret in environment variables for production
- Session cookies are read via Next.js `cookies()` API (server-side only)
