FROM node:20-alpine AS base

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate

ARG JWT_SECRET=build_time_placeholder
ENV JWT_SECRET=$JWT_SECRET
RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
