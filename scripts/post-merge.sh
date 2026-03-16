#!/bin/bash
set -e

npm install --legacy-peer-deps

npx prisma migrate deploy || npx prisma db push --accept-data-loss

npx prisma generate
