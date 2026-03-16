import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const ceoPassword = await bcrypt.hash("ChangeMe123!", 10);

  await prisma.user.upsert({
    where: { username: "ceo" },
    update: {},
    create: {
      username: "ceo",
      displayName: "Chief Executive",
      role: "CEO",
      passwordHash: ceoPassword,
    },
  });

  console.log("Created CEO user (ceo / ChangeMe123!)");

  const products = [
    { name: "Heineken", sellPrice: 2500, costPrice: 1500, qty: 48 },
    { name: "Star Lager", sellPrice: 2000, costPrice: 1200, qty: 60 },
    { name: "Guinness", sellPrice: 3000, costPrice: 1800, qty: 36 },
    { name: "Club Beer", sellPrice: 2000, costPrice: 1100, qty: 72 },
    { name: "Smirnoff Ice", sellPrice: 3500, costPrice: 2000, qty: 24 },
    { name: "Jack Daniels (shot)", sellPrice: 5000, costPrice: 2500, qty: 50 },
    { name: "Hennessy VS (shot)", sellPrice: 8000, costPrice: 4500, qty: 30 },
    { name: "Red Bull", sellPrice: 2000, costPrice: 1200, qty: 40 },
    { name: "Coca-Cola", sellPrice: 1000, costPrice: 500, qty: 100 },
    { name: "Water (500ml)", sellPrice: 500, costPrice: 200, qty: 120 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }

  console.log(`Seeded ${products.length} demo products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
