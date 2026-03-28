import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "kyc-uploads");

async function ensureDir(dir: string) {
  try { await fs.mkdir(dir, { recursive: true }); } catch { /* already exists */ }
}

function safeExt(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpg") || mime.includes("jpeg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "bin";
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const kyc = await prisma.kycDocument.findUnique({ where: { userId: session.id } });
  return NextResponse.json({ kyc });
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, verificationStatus: true, isVerified: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.isVerified) return NextResponse.json({ error: "Account already verified." }, { status: 400 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const frontFile = formData.get("front") as File | null;
  const backFile = formData.get("back") as File | null;

  if (!frontFile || !backFile) {
    return NextResponse.json({ error: "Both front and back Ghana Card images are required." }, { status: 400 });
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (frontFile.size > MAX_SIZE || backFile.size > MAX_SIZE) {
    return NextResponse.json({ error: "Each image must be under 10 MB." }, { status: 400 });
  }

  const userDir = path.join(UPLOAD_DIR, user.id);
  await ensureDir(userDir);

  const frontExt = safeExt(frontFile.type);
  const backExt = safeExt(backFile.type);
  const frontPath = path.join(userDir, `front.${frontExt}`);
  const backPath = path.join(userDir, `back.${backExt}`);

  await fs.writeFile(frontPath, Buffer.from(await frontFile.arrayBuffer()));
  await fs.writeFile(backPath, Buffer.from(await backFile.arrayBuffer()));

  const relFront = `${user.id}/front.${frontExt}`;
  const relBack = `${user.id}/back.${backExt}`;

  await prisma.$transaction([
    prisma.kycDocument.upsert({
      where: { userId: user.id },
      create: { userId: user.id, frontPath: relFront, backPath: relBack, status: "PENDING" },
      update: { frontPath: relFront, backPath: relBack, status: "PENDING", adminNote: null, reviewedAt: null, reviewedBy: null },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { verificationStatus: "PENDING" },
    }),
  ]);

  return NextResponse.json({ ok: true, message: "Documents submitted. We will review within 1–2 business days." });
}
