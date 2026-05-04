ALTER TABLE "User" ADD COLUMN IF NOT EXISTS temp_verification text;
UPDATE "User" SET temp_verification = "verificationStatus"::text;