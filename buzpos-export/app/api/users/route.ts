import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Role } from "@prisma/client";

function isAuthError(e: unknown): { status: number; message: string } | null {
  if (e instanceof Error) {
    if (e.message === "Unauthorized") return { status: 401, message: "Unauthorized" };
    if (e.message === "Forbidden") return { status: 403, message: "Forbidden" };
  }
  return null;
}

export async function GET(req: Request) {
  try {
    requireAuth(req, ["CEO"]);
    const users = await prisma.user.findMany({
      select: { id: true, username: true, displayName: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch (e: unknown) {
    const authErr = isAuthError(e);
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    requireAuth(req, ["CEO"]);
    const body = await req.json();
    const { username, displayName, role, password, pin } = body as {
      username: string;
      displayName: string;
      role: Role;
      password?: string;
      pin?: string;
    };

    if (!username || !displayName || !role) {
      return NextResponse.json({ error: "username, displayName, role required" }, { status: 400 });
    }

    const validRoles: Role[] = ["CEO", "MANAGER", "WAITER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (role === "WAITER" && !pin) {
      return NextResponse.json({ error: "PIN required for WAITER" }, { status: 400 });
    }
    if (role === "WAITER" && pin && !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });
    }
    if (role !== "WAITER" && !password) {
      return NextResponse.json({ error: "Password required for CEO/MANAGER" }, { status: 400 });
    }

    const createData: Prisma.UserCreateInput = { username, displayName, role };
    if (role === "WAITER" && pin) {
      createData.pinHash = await bcrypt.hash(pin, 10);
    } else if (password) {
      createData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.create({ data: createData });
    return NextResponse.json(
      { id: user.id, username: user.username, displayName: user.displayName, role: user.role, active: user.active },
      { status: 201 }
    );
  } catch (e: unknown) {
    const authErr = isAuthError(e);
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    console.error("Create user error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    requireAuth(req, ["CEO"]);
    const body = await req.json();
    const { id, active, password, pin } = body as {
      id: string;
      active?: boolean;
      password?: string;
      pin?: string;
    };

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (active === false && user.role === "CEO") {
      const activeCeos = await prisma.user.count({ where: { role: "CEO", active: true } });
      if (activeCeos <= 1) {
        return NextResponse.json({ error: "Cannot deactivate the last active CEO" }, { status: 400 });
      }
    }

    if (pin && !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (active !== undefined) updateData.active = active;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
    if (pin) updateData.pinHash = await bcrypt.hash(pin, 10);

    const updated = await prisma.user.update({ where: { id }, data: updateData });
    return NextResponse.json({
      id: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      role: updated.role,
      active: updated.active,
    });
  } catch (e: unknown) {
    const authErr = isAuthError(e);
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
