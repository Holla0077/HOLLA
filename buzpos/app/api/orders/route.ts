import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { stripSensitiveOrderListFields } from "@/lib/serialize";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

const VALID_STATUSES: OrderStatus[] = ["OPEN", "PAID", "VOID"];

export async function GET(req: Request) {
  try {
    const payload = requireAuth(req);
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") || "OPEN";

    if (!VALID_STATUSES.includes(statusParam as OrderStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const orders = await prisma.order.findMany({
      where: { status: statusParam as OrderStatus },
      include: {
        items: { include: { product: { select: { name: true } } } },
        user: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (payload.role === "WAITER") {
      return NextResponse.json(stripSensitiveOrderListFields(orders));
    }

    return NextResponse.json(orders);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = requireAuth(req);
    const order = await prisma.order.create({
      data: { userId: payload.id, status: "OPEN" },
      include: { items: true },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
