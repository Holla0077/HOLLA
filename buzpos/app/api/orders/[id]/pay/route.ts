import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { stripSensitiveOrderFields } from "@/lib/serialize";
import prisma from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = requireAuth(req);
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });

      if (!order || order.status !== "OPEN") {
        throw new Error("ORDER_NOT_OPEN");
      }

      if (order.items.length === 0) {
        throw new Error("ORDER_EMPTY");
      }

      const updated = await tx.order.updateMany({
        where: { id, status: "OPEN" },
        data: { status: "PAID", paidAt: new Date() },
      });

      if (updated.count === 0) {
        throw new Error("ORDER_ALREADY_PROCESSED");
      }

      const stockErrors: string[] = [];
      for (const item of order.items) {
        if (item.product.qty < item.qty) {
          stockErrors.push(
            `${item.product.name}: need ${item.qty}, only ${item.product.qty} in stock`
          );
        }
      }

      if (stockErrors.length > 0) {
        throw new Error("INSUFFICIENT_STOCK:" + JSON.stringify(stockErrors));
      }

      let totalRevenue = 0;
      let totalProfit = 0;

      for (const item of order.items) {
        const lineRevenue = item.unitPrice * item.qty;
        const lineProfit = (item.unitPrice - item.costPrice) * item.qty;
        totalRevenue += lineRevenue;
        totalProfit += lineProfit;

        await tx.orderItem.update({
          where: { id: item.id },
          data: { lineRevenue, lineProfit },
        });

        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: { qty: { decrement: item.qty } },
        });

        if (updatedProduct.qty < 0) {
          throw new Error("INSUFFICIENT_STOCK:" + JSON.stringify([
            `${item.product.name}: insufficient stock after concurrent modification`
          ]));
        }

        await tx.stockMovement.create({
          data: {
            type: "SALE",
            qty: -item.qty,
            costSnapshot: item.costPrice,
            priceSnapshot: item.unitPrice,
            productId: item.productId,
            orderId: id,
          },
        });
      }

      await tx.order.update({
        where: { id },
        data: { totalRevenue, totalProfit },
      });

      return { id };
    });

    const paid = await prisma.order.findUnique({
      where: { id: result.id },
      include: {
        items: { include: { product: { select: { id: true, name: true, qty: true, sellPrice: true } } } },
        user: { select: { displayName: true } },
      },
    });

    if (!paid) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (payload.role === "WAITER") {
      return NextResponse.json(stripSensitiveOrderFields(paid));
    }

    return NextResponse.json(paid);
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (e.message === "ORDER_NOT_OPEN" || e.message === "ORDER_ALREADY_PROCESSED") {
        return NextResponse.json({ error: "Order not found or not open" }, { status: 400 });
      }
      if (e.message === "ORDER_EMPTY") {
        return NextResponse.json({ error: "Order has no items" }, { status: 400 });
      }
      if (e.message.startsWith("INSUFFICIENT_STOCK:")) {
        const details: string[] = JSON.parse(e.message.replace("INSUFFICIENT_STOCK:", ""));
        return NextResponse.json({ error: "Insufficient stock", details }, { status: 400 });
      }
    }
    console.error("Pay error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
