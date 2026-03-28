# KashBoy — Local Development & Deployment Guide

## Prerequisites

- Node.js 20+ (LTS recommended)
- PostgreSQL 14+
- pnpm or npm

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd kashboy
npm install
```

---

## 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in all values. Key variables:

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Your DB provider |
| `JWT_SECRET` | 32-byte random hex | `node -e "require('crypto').randomBytes(32).toString('hex')"` |
| `ADMIN_PASSWORD` | Admin panel password | Choose a strong password |
| `MTN_COLLECTION_KEY` | MTN MoMo Collections subscription key | https://momodeveloper.mtn.com |
| `MTN_DISBURSEMENT_KEY` | MTN MoMo Disbursements subscription key | https://momodeveloper.mtn.com |
| `MTN_CONSUMER_KEY` | MTN API user UUID | Run the setup script (see below) |
| `MTN_CONSUMER_SECRET` | MTN API user secret | Run the setup script (see below) |
| `BTC_MASTER_SEED` | 64-byte hex seed for BTC HD wallet | See Bitcoin Wallet Setup below |
| `RESEND_API_KEY` | Resend email API key | https://resend.com |

---

## 3. Database Setup

Run Prisma migrations:

```bash
npx prisma migrate deploy
npx prisma db seed   # optional: seed test data
```

Generate the Prisma client:

```bash
npx prisma generate
```

---

## 4. Bitcoin Wallet Setup

⚠️ **CRITICAL**: Generate your master seed exactly once and store it safely. If you lose it, all user deposit addresses are lost and any Bitcoin sent there is unrecoverable.

Generate a master seed:

```bash
node -e "require('crypto').randomBytes(64).toString('hex')"
```

Save the output as `BTC_MASTER_SEED` in your environment.

For testing, set `BTC_NETWORK=testnet`. For production, set `BTC_NETWORK=mainnet`.

---

## 5. MTN MoMo API Setup (Sandbox)

1. Register at https://momodeveloper.mtn.com
2. Subscribe to **Collection** and **Disbursements** products
3. Copy your subscription keys to `MTN_COLLECTION_KEY` and `MTN_DISBURSEMENT_KEY`
4. Create an API user (call the `/v1_0/apiuser` endpoint or use the developer portal)
5. Set `MTN_MOMO_ENV=sandbox` and `MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com`

For production Ghana:
- `MTN_MOMO_ENV=mtn-gh`
- `MTN_MOMO_BASE_URL=https://proxy.momoapi.mtn.com`

---

## 6. Email Setup (Resend)

1. Create an account at https://resend.com
2. Add and verify your domain: `kashboy.com`
3. Create an API key and save as `RESEND_API_KEY`
4. Set `EMAIL_FROM=KashBoy <noreply@kashboy.com>`

---

## 7. Run Locally

```bash
npm run dev
```

App runs at http://localhost:3000 (or port 5000 if configured).

---

## 8. Production Deployment (kashboy.com)

### Recommended: Vercel

```bash
npm install -g vercel
vercel deploy --prod
```

Set all environment variables in the Vercel dashboard under Settings → Environment Variables.

### Recommended: Railway / Render / Fly.io

1. Create a new project and connect your GitHub repo
2. Set all env vars in the platform dashboard
3. PostgreSQL: use the platform's managed database
4. The app uses Next.js — configure the build command: `npm run build`

### Domain Setup

1. Point `kashboy.com` DNS to your hosting provider
2. Update `NEXT_PUBLIC_APP_URL=https://kashboy.com` in production env vars
3. Update `EMAIL_FROM=KashBoy <noreply@kashboy.com>` (verify domain in Resend)

---

## 9. Opening in VS Code

```bash
code .
```

Recommended extensions:
- **Prisma** (Prisma.prisma)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **ESLint** (dbaeumer.vscode-eslint)
- **TypeScript Next** (ms-vscode.vscode-typescript-next)

---

## 10. Project Structure

```
kashboy/
├── app/                   # Next.js App Router pages
│   ├── api/               # API route handlers
│   │   ├── admin/         # Admin panel APIs
│   │   ├── crypto/btc/    # Bitcoin deposit APIs
│   │   ├── topup/         # MoMo topup + status polling
│   │   └── withdraw/      # MoMo withdraw + status polling
│   ├── app/               # Authenticated app pages
│   │   ├── home/          # Main dashboard
│   │   ├── settings/      # User settings + KYC
│   │   └── send-receive/  # Transfer page
│   └── page.tsx           # Landing page
├── lib/                   # Shared utilities
│   ├── bitcoin.ts         # BTC HD wallet (BIP32/BIP44)
│   ├── email.ts           # Email service (Resend)
│   ├── mtn-momo.ts        # MTN Mobile Money SDK wrapper
│   ├── auth.ts            # JWT auth helpers
│   └── prisma.ts          # Prisma client singleton
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Migration history
└── .env.example           # Environment variable reference
```

---

## Removing Replit-Specific Config

The following are Replit-specific and can be removed when deploying elsewhere:

1. **`.replit`** — Replit workspace config (safe to delete)
2. **`replit.nix`** — Nix package config (safe to delete; use your system Node instead)
3. **Port 5000** in dev script — change to 3000 in `package.json` if preferred
4. **`REPLIT_DOMAINS`, `REPL_ID`** — Replit-injected; not needed outside Replit

The app code itself is fully standard Next.js and runs anywhere Node.js is available.
