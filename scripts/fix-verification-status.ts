import prisma from '@/src/shared/database/prisma';

async function fix() {
  console.log('Restoring verification statuses...');
  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "verificationStatus" = CASE
      WHEN temp_verification = 'APPROVED' THEN 'VERIFIED'
      WHEN temp_verification = 'REJECTED' THEN 'UNVERIFIED'
      WHEN temp_verification = 'NONE' THEN 'UNVERIFIED'
      ELSE 'UNVERIFIED' -- fallback
    END::"VerificationStatus";
  `);
  // Drop the temporary column
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" DROP COLUMN temp_verification;`);
  console.log('✅ Verification statuses restored and temp column removed.');
}

fix()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });