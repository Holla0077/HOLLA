// prisma/seed.ts
import { PrismaClient, AssetType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const assets = [
    { code: "GHS", name: "Ghana Cedi", type: AssetType.FIAT },

    { code: "BTC", name: "Bitcoin", type: AssetType.CRYPTO },
    { code: "ETH", name: "Ethereum", type: AssetType.CRYPTO },
    { code: "USDT_ERC20", name: "Tether (ERC20)", type: AssetType.CRYPTO },
    { code: "USDC_ERC20", name: "USD Coin (ERC20)", type: AssetType.CRYPTO },
    { code: "LTC", name: "Litecoin", type: AssetType.CRYPTO },
    { code: "DASH", name: "Dash", type: AssetType.CRYPTO },
    { code: "BCH", name: "Bitcoin Cash", type: AssetType.CRYPTO },
  ];

  for (const a of assets) {
    await prisma.asset.upsert({
      where: { code: a.code },
      update: { name: a.name, type: a.type },
      create: a,
    });
  }

  console.log("Seeded assets:", assets.map((a) => a.code).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
