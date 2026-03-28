-- CreateTable
CREATE TABLE "CryptoAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coin" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "hdIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoDeposit" (
    "id" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "vout" INTEGER NOT NULL,
    "amountSat" BIGINT NOT NULL,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "walletId" TEXT,
    "txRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CryptoAddress_address_key" ON "CryptoAddress"("address");

-- CreateIndex
CREATE INDEX "CryptoAddress_coin_idx" ON "CryptoAddress"("coin");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoAddress_userId_coin_key" ON "CryptoAddress"("userId", "coin");

-- CreateIndex
CREATE INDEX "CryptoDeposit_addressId_idx" ON "CryptoDeposit"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoDeposit_txid_vout_key" ON "CryptoDeposit"("txid", "vout");

-- AddForeignKey
ALTER TABLE "CryptoAddress" ADD CONSTRAINT "CryptoAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoDeposit" ADD CONSTRAINT "CryptoDeposit_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "CryptoAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
