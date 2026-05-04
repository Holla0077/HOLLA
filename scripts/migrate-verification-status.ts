import prisma from '@/src/shared/database/prisma';

async function migrate() {
  console.log('Migrating VerificationStatus values…');

  // Map old values to new
  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "verificationStatus" = 'UNVERIFIED'
    WHERE "verificationStatus" IN ('NONE', 'REJECTED');
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "verificationStatus" = 'VERIFIED'
    WHERE "verificationStatus" = 'APPROVED';
  `);

  console.log('✅ Migration complete.');
}

migrate()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });