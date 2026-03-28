-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: add verificationStatus to User
ALTER TABLE "User" ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NONE';

-- CreateTable: KycDocument
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frontPath" TEXT NOT NULL,
    "backPath" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycDocument_userId_key" ON "KycDocument"("userId");

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: AdminAuditLog
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);
