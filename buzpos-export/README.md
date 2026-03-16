# BUZ POS — Nightclub Point of Sale System

A LAN-first Nightclub POS and Inventory system supporting three roles (CEO, MANAGER, WAITER) with product management, order taking, payment processing, stock tracking, and reporting.

## Features

- **Role-based access**: CEO, MANAGER, WAITER with server-side enforcement
- **POS**: Product search, order creation, item management, payment with stock validation
- **Inventory**: Stock-in with cost price updates, low-stock alerts
- **Reports**: Today's sales, profit, order count (auto-refreshing dashboard)
- **User Management**: CEO can create/deactivate users, reset credentials
- **Void Orders**: CEO/MANAGER can void paid orders with stock reversal and audit logging

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL database

### Setup

```bash
# Install dependencies
npm install

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/buzpos"
export JWT_SECRET="your_secret_key"

# Run migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`.

### Default Login
- **Username**: `ceo`
- **Password**: `ChangeMe123!`

## Docker Compose (LAN Deployment)

```bash
# Start services
docker compose up -d

# Run migrations and seed
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed

# Access at http://localhost:3000
```

## Money Format

All monetary values are stored in **pesewas** (minor units). 1 GHS = 100 pesewas.

## API Overview

| Endpoint | Methods | Access |
|---|---|---|
| `/api/login` | POST | Public |
| `/api/logout` | POST | All |
| `/api/me` | GET | All |
| `/api/products` | GET, POST, PUT | GET: All, POST/PUT: CEO/MANAGER |
| `/api/stock-in` | POST | CEO/MANAGER |
| `/api/orders` | GET, POST | All |
| `/api/orders/[id]` | GET, POST, DELETE | All |
| `/api/orders/[id]/pay` | POST | All |
| `/api/orders/[id]/void` | POST | CEO/MANAGER |
| `/api/reports` | GET | CEO/MANAGER |
| `/api/users` | GET, POST, PUT | CEO only |
