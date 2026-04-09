import prisma from "@/lib/prisma";

const CORE_ASSETS = [
  { code: "GHS", name: "Ghana Cedi", type: "FIAT" as const },

  { code: "BTC", name: "Bitcoin", type: "CRYPTO" as const },
  { code: "LTC", name: "Litecoin", type: "CRYPTO" as const },
  { code: "ETH", name: "Ethereum", type: "CRYPTO" as const },
  { code: "DASH", name: "Dashcoin", type: "CRYPTO" as const },
  { code: "BCH", name: "Bitcoin Cash", type: "CRYPTO" as const },

  { code: "USDT_ERC20", name: "USDT (ERC-20)", type: "CRYPTO" as const },
  { code: "USDC_ERC20", name: "USDC (ERC-20)", type: "CRYPTO" as const },
];

export async function ensureCoreAssetsAndUserWallets(userId: string) {
  // 1. Ensure assets exist (outside transaction — safer)
  await Promise.all(
    CORE_ASSETS.map((a) =>
      prisma.asset.upsert({
        where: { code: a.code },
        update: { name: a.name, type: a.type },
        create: { code: a.code, name: a.name, type: a.type },
      })
    )
  );

  // 2. Fetch asset IDs
  const assets = await prisma.asset.findMany({
    where: {
      code: { in: CORE_ASSETS.map((x) => x.code) },
    },
    select: { id: true },
  });

  // 3. Create wallets (batch insert)
  await prisma.wallet.createMany({
    data: assets.map((asset) => ({
      userId,
      assetId: asset.id,
      balance: BigInt(0),
    })),
    skipDuplicates: true,
  });

  return { ok: true };
}