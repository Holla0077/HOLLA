BEGIN;

-- 1. Remove default expressions temporarily
ALTER TABLE "User" ALTER COLUMN "verificationStatus" DROP DEFAULT;
ALTER TABLE "KycDocument" ALTER COLUMN "status" DROP DEFAULT;

-- 2. Convert both columns to text (avoids enum lock issues)
ALTER TABLE "User" ALTER COLUMN "verificationStatus" TYPE text;
ALTER TABLE "KycDocument" ALTER COLUMN "status" TYPE text;

-- 3. Drop the old enum type
DROP TYPE "VerificationStatus";

-- 4. Create the new enum with only the desired values
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');

-- 5. Convert columns back to the new enum, casting existing text appropriately
-- Data migration: map old text values to new enum labels
ALTER TABLE "User" ALTER COLUMN "verificationStatus" TYPE "VerificationStatus"
  USING (
    CASE
      WHEN "verificationStatus" = 'APPROVED' THEN 'VERIFIED'::"VerificationStatus"
      WHEN "verificationStatus" = 'REJECTED' THEN 'UNVERIFIED'::"VerificationStatus"
      WHEN "verificationStatus" = 'NONE' THEN 'UNVERIFIED'::"VerificationStatus"
      ELSE "verificationStatus"::"VerificationStatus"
    END
  );

ALTER TABLE "KycDocument" ALTER COLUMN "status" TYPE "VerificationStatus"
  USING (
    CASE
      WHEN "status" = 'APPROVED' THEN 'VERIFIED'::"VerificationStatus"
      WHEN "status" = 'REJECTED' THEN 'UNVERIFIED'::"VerificationStatus"
      WHEN "status" = 'NONE' THEN 'UNVERIFIED'::"VerificationStatus"
      ELSE "status"::"VerificationStatus"
    END
  );

-- 6. Re-add default values (matching your Prisma schema defaults)
ALTER TABLE "User" ALTER COLUMN "verificationStatus" SET DEFAULT 'UNVERIFIED';
ALTER TABLE "KycDocument" ALTER COLUMN "status" SET DEFAULT 'UNVERIFIED';

COMMIT;