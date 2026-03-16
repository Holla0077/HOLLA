import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = requireAuth(req, ["CEO", "MANAGER"]);
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id, status: "PAID" },
        data: { status: "VOID" },
      });

      if (updated.count === 0) {
        throw new Error("VOID_INVALID");
      }

      const order = await tx.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });

      if (!order) throw new Error("VOID_INVALID");

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { qty: { increment: item.qty } },
        });

        await tx.stockMovement.create({
          data: {
            type: "VOID_REVERSAL",
            qty: item.qty,
            costSnapshot: item.costPrice,
            priceSnapshot: item.unitPrice,
            productId: item.productId,
            orderId: id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "VOID_ORDER",
          detail: `Voided order ${id} (was ${order.totalRevenue} revenue)`,
          userId: payload.id,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === "Unauthorized" || e.message === "Forbidden") {
        return NextResponse.json(
          { error: e.message },
          { status: e.message === "Forbidden" ? 403 : 401 }
        );
      }
      if (e.message === "VOID_INVALID") {
        return NextResponse.json({ error: "Only paid orders can be voided" }, { status: 400 });
      }
    }
    console.error("Void error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
