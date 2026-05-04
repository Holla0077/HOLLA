import prisma from '@/src/shared/database/prisma';

async function seed() {
  // 1. Create SYSTEM user if not exists
  const systemUser = await prisma.user.upsert({
    where: { id: 'SYSTEM' },
    update: {},
    create: {
      id: 'SYSTEM',
      username: 'kashboy_system',
      email: 'system@kashboy.com',
      phone: '+233000000000',
      passwordHash: '', // never used
      isVerified: true,
      verificationStatus: 'VERIFIED',
      fullName: 'KashBoy System',
    },
  });

  // 2. Ensure required assets exist (GHS, BTC already exist, we just need all)
  const assets = await prisma.asset.findMany();

  // 3. Create internal treasury wallets
  const treasuryNameByCode: Record<string, string> = {
    GHS: 'COMPANY_GHS_RESERVE',
    BTC: 'COMPANY_BTC_RESERVE',
  };

  for (const asset of assets) {
    const name = treasuryNameByCode[asset.code] || `TREASURY_${asset.code}`;
    await prisma.wallet.upsert({
      where: { userId_assetId: { userId: systemUser.id, assetId: asset.id } },
      update: { isSystem: true },
      create: {
        userId: systemUser.id,
        assetId: asset.id,
        balance: 0n,
        isSystem: true,
      },
    });
  }

  console.log('✅ Treasury wallets seeded.');
}

seed()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });