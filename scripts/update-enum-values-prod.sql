UPDATE "User" SET "verificationStatus" = 'UNVERIFIED' WHERE "verificationStatus" = 'NONE';
UPDATE "User" SET "verificationStatus" = 'VERIFIED'  WHERE "verificationStatus" = 'APPROVED';
UPDATE "User" SET "verificationStatus" = 'UNVERIFIED' WHERE "verificationStatus" = 'REJECTED';