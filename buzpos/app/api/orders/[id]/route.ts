import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { stripSensitiveOrderFields } from "@/lib/serialize";
import prisma from "@/lib/prisma";

const ORDER_INCLUDE = {
  items: { include: { product: { select: { id: true, name: true, qty: true, sellPrice: true } } } },
  user: { select: { displayName: true } },
} as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = requireAuth(req);
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (payload.role === "WAITER") {
      return NextResponse.json(stripSensitiveOrderFields(order));
    }

    return NextResponse.json(order);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const { productId, qty } = body as { productId: string; qty: number };

    if (!productId || !qty || qty <= 0) {
      return NextResponse.json({ error: "productId and positive qty required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.status !== "OPEN") {
      return NextResponse.json({ error: "Order not found or not open" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.active) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const existing = await prisma.orderItem.findUnique({
      where: { orderId_productId: { orderId: id, productId } },
    });

    if (existing) {
      await prisma.orderItem.update({
        where: { id: existing.id },
        data: { qty: existing.qty + qty, unitPrice: product.sellPrice, costPrice: product.costPrice },
      });
    } else {
      await prisma.orderItem.create({
        data: {
          orderId: id,
          productId,
          qty,
          unitPrice: product.sellPrice,
          costPrice: product.costPrice,
        },
      });
    }

    const updated = await prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (payload.role === "WAITER") {
      return NextResponse.json(stripSensitiveOrderFields(updated));
    }

    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Add item error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const { itemId } = body as { itemId: string };

    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.status !== "OPEN") {
      return NextResponse.json({ error: "Order not found or not open" }, { status: 400 });
    }

    const item = await prisma.orderItem.findFirst({
      where: { id: itemId, orderId: id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found in this order" }, { status: 404 });
    }

    await prisma.orderItem.delete({ where: { id: itemId } });

    const updated = await prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (payload.role === "WAITER") {
      return NextResponse.json(stripSensitiveOrderFields(updated));
    }

    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
