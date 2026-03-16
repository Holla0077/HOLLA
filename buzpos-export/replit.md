# BUZ POS — Nightclub Point of Sale System

## Overview
A LAN-first Next.js 16 POS and inventory system for nightclubs.
Supports CEO / MANAGER / WAITER roles, PIN/password auth, product management,
table orders, stock tracking, and daily sales reports.

## Stack
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT stored in `buz_session` HTTP-only cookie, 12h expiry
- **Styling**: Tailwind CSS v4

## First-Time Setup in a New Replit

1. Add a **PostgreSQL** database from the Replit Database panel (sets `DATABASE_URL` automatically).
2. Add a **Secret** named `JWT_SECRET` with a strong random value.
3. Run in the Shell:
   ```
   npm install
   npx prisma migrate deploy
   npx prisma db seed
   ```
4. Start the dev server: `npm run dev`

## Roles
| Role | Access |
|---|---|
| CEO | All pages + user management |
| MANAGER | Dashboard, products, stock-in |
| WAITER | POS only |

## Routes
- `/login` — Login page
- `/pos` — Waiter POS (open orders, add items)
- `/pos/order/[id]` — Order detail + payment
- `/manager/dashboard` — Sales summary (5s polling)
- `/manager/products` — Product CRUD
- `/manager/stock-in` — Record stock deliveries
- `/ceo/users` — User management

## Key API Routes
- `POST /api/login` / `POST /api/logout`
- `GET/POST /api/products`
- `GET/POST /api/orders`, `GET/PATCH /api/orders/[id]`
- `POST /api/orders/[id]/pay` — Atomic status + stock decrement
- `POST /api/orders/[id]/void` — Atomic void + stock reversal
- `POST /api/stock-in`
- `GET /api/reports/today`
- `GET/POST/PATCH /api/users` (CEO only)

## Seed Data
Running `npm run seed` creates:
- One CEO account
- 10 demo products with stock

## Environment Variables
- `DATABASE_URL` — Set automatically by Replit PostgreSQL
- `JWT_SECRET` — Must be set manually in Replit Secrets
