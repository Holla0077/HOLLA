import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    requireAuth(req, ["CEO", "MANAGER"]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const paidOrders = await prisma.order.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: todayStart, lte: todayEnd },
      },
    });

    const totalRevenue = paidOrders.reduce((s, o) => s + o.totalRevenue, 0);
    const totalProfit = paidOrders.reduce((s, o) => s + o.totalProfit, 0);
    const orderCount = paidOrders.length;

    const lowStockProducts = await prisma.product.findMany({
      where: { active: true, qty: { lte: 10 } },
      orderBy: { qty: "asc" },
    });

    return NextResponse.json({
      totalRevenue,
      totalProfit,
      orderCount,
      lowStockProducts,
    });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden")) {
      return NextResponse.json(
        { error: e.message },
        { status: e.message === "Forbidden" ? 403 : 401 }
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
