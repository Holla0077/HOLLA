import prisma from '@/src/shared/database/prisma';

async function preMigrate() {
  console.log('Setting non-overlapping statuses to PENDING...');
  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "verificationStatus" = 'PENDING'
    WHERE "verificationStatus" IN ('NONE', 'APPROVED', 'REJECTED');
  `);
  console.log('✅ Done. Safe to push schema now.');
}

preMigrate()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });