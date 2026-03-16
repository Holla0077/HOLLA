import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const payload = requireAuth(req);
    const showAll = payload.role === "CEO" || payload.role === "MANAGER";
    const products = await prisma.product.findMany({
      where: showAll ? {} : { active: true },
      orderBy: { name: "asc" },
    });

    if (payload.role === "WAITER") {
      return NextResponse.json(
        products.map(({ costPrice, ...p }) => p)
      );
    }
    return NextResponse.json(products);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    requireAuth(req, ["CEO", "MANAGER"]);
    const body = await req.json();
    const { name, sellPrice, costPrice } = body as { name: string; sellPrice: number; costPrice: number };

    if (!name || sellPrice == null || costPrice == null) {
      return NextResponse.json({ error: "name, sellPrice, costPrice required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: { name, sellPrice: Math.round(sellPrice), costPrice: Math.round(costPrice) },
    });

    return NextResponse.json(product, { status: 201 });
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

export async function PUT(req: Request) {
  try {
    requireAuth(req, ["CEO", "MANAGER"]);
    const body = await req.json();
    const { id, name, sellPrice, costPrice, active } = body as {
      id: string;
      name?: string;
      sellPrice?: number;
      costPrice?: number;
      active?: boolean;
    };

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const data: Prisma.ProductUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (sellPrice !== undefined) data.sellPrice = Math.round(sellPrice);
    if (costPrice !== undefined) data.costPrice = Math.round(costPrice);
    if (active !== undefined) data.active = active;

    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json(product);
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
