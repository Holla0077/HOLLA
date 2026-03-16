import prisma from "@/lib/prisma";

/**
 * Core assets we support right now (matches your requirements).
 * NOTE: `code` must match what we will use everywhere in UI + backend.
 */
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

/**
 * Ensures assets exist in DB, and ensures the new user has wallets for each asset.
 * Safe to call multiple times (idempotent).
 */
export async function ensureCoreAssetsAndUserWallets(userId: string) {
  return prisma.$transaction(async (tx) => {
    // 1) Ensure assets exist
    for (const a of CORE_ASSETS) {
      await tx.asset.upsert({
        where: { code: a.code },
        update: { name: a.name, type: a.type },
        create: { code: a.code, name: a.name, type: a.type },
      });
    }

    // 2) Ensure user wallets exist
    const assets = await tx.asset.findMany({
      where: { code: { in: CORE_ASSETS.map((x) => x.code) } },
      select: { id: true, code: true },
    });

    for (const asset of assets) {
      await tx.wallet.upsert({
        where: {
          userId_assetId: {
            userId,
            assetId: asset.id,
          },
        },
        update: {},
        create: {
          userId,
          assetId: asset.id,
          balance: BigInt(0),
        },
      });
    }

    return { ok: true };
  });
}
