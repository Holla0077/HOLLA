import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    requireAuth(req, ["CEO", "MANAGER"]);
    const body = await req.json();
    const { productId, qty, costPrice } = body as {
      productId: string;
      qty: number;
      costPrice?: number;
    };

    if (!productId || !qty || qty <= 0) {
      return NextResponse.json({ error: "productId and positive qty required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const updateData: Prisma.ProductUpdateInput = { qty: { increment: Math.round(qty) } };
    if (costPrice !== undefined && costPrice !== null) {
      updateData.costPrice = Math.round(costPrice);
    }

    const [updated] = await prisma.$transaction([
      prisma.product.update({ where: { id: productId }, data: updateData }),
      prisma.stockMovement.create({
        data: {
          type: "STOCK_IN",
          qty: Math.round(qty),
          costSnapshot: costPrice != null ? Math.round(costPrice) : product.costPrice,
          priceSnapshot: product.sellPrice,
          productId,
        },
      }),
    ]);

    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden")) {
      return NextResponse.json(
        { error: e.message },
        { status: e.message === "Forbidden" ? 403 : 401 }
      );
    }
    console.error("Stock-in error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
