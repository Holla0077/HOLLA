import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function POST() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { isVerified: true, fullName: true, email: true, username: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.isVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true, message: "Your account is already verified." });
  }

  if (!user.fullName) {
    return NextResponse.json(
      { error: "Please complete your full name in Personal settings before requesting verification." },
      { status: 400 }
    );
  }

  // Log the request server-side so the admin can action it manually.
  console.log(
    `[VERIFY REQUEST] userId=${session.id} username=${user.username} email=${user.email} at=${new Date().toISOString()}`
  );

  return NextResponse.json({
    ok: true,
    message: "Verification request submitted. Our team will review your account and contact you within 1–2 business days.",
  });
}
