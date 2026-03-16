# BUZ POS — Nightclub Point of Sale System

## Overview
A Next.js 16 LAN-first Nightclub POS and Inventory system supporting three roles (CEO, MANAGER, WAITER) with product management, order taking, payment processing, stock tracking, reporting, and user management.

## Architecture
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT-based sessions stored in `buz_session` HTTP-only cookie
- **Styling**: Tailwind CSS v4
- **Money**: All monetary values in pesewas (integer minor units, 1 GHS = 100 pesewas)

## Key Structure
- `app/` — Next.js App Router pages and API routes
  - `app/api/login` — POST login (username + credential)
  - `app/api/logout` — POST logout
  - `app/api/me` — GET current user
  - `app/api/products` — GET/POST/PUT product CRUD (CEO/MANAGER for writes)
  - `app/api/stock-in` — POST add stock (CEO/MANAGER)
  - `app/api/orders` — GET/POST orders
  - `app/api/orders/[id]` — GET/POST(add item)/DELETE(remove item) order items
  - `app/api/orders/[id]/pay` — POST pay order (validates stock)
  - `app/api/orders/[id]/void` — POST void paid order (CEO/MANAGER)
  - `app/api/reports` — GET today's report (CEO/MANAGER)
  - `app/api/users` — GET/POST/PUT user management (CEO only)
  - `app/login/` — Login page
  - `app/pos/` — POS page (product grid, open orders)
  - `app/pos/order/[id]/` — Order edit view with pay button
  - `app/manager/dashboard/` — Today's sales dashboard (auto-polls every 5s)
  - `app/manager/products/` — Product CRUD table with modals
  - `app/manager/stock-in/` — Stock-in form
  - `app/ceo/users/` — User management (CEO only)
- `components/TopBar.tsx` — Shared nav bar with role-aware links
- `lib/auth.ts` — JWT sign/verify, requireAuth helper
- `lib/auth.server.ts` — Server-only cookie reader
- `lib/session.ts` — getSessionUser helper
- `lib/prisma.ts` — Prisma client singleton
- `middleware.ts` — Route protection by role
- `prisma/schema.prisma` — Database models
- `prisma/seed.ts` — Seed CEO user + demo products

## Roles
- **CEO**: Full access to all routes and data
- **MANAGER**: Access to /pos and /manager/* routes
- **WAITER**: Access to /pos only; costPrice and profit fields are stripped from API responses

## Cookie Name
All auth uses cookie: `buz_session`

## Default Login
- Username: `ceo`, Password: `ChangeMe123!`

## Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret key for signing JWT tokens

## Running on Replit
- Dev server: `npm run dev` (port 5000, bound to 0.0.0.0)
- The workflow "Start application" runs `npm run dev` automatically
- Seed: `npx prisma db seed` or `npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts`

## Docker Compose
- `docker-compose.yml` included for LAN deployment (postgres + app on port 3000)
- `Dockerfile` included for building the production image
