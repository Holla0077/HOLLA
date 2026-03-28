import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "kyc-uploads");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string; filename: string }> }
) {
  if (!(await getAdminSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { userId, filename } = await params;

  // Strict filename validation — prevent path traversal
  if (!/^(front|back)\.(jpg|png|webp|bin)$/.test(filename)) {
    return new Response("Not found", { status: 404 });
  }
  if (/[/\\]/.test(userId)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, userId, filename);

  let buf: Buffer;
  try {
    buf = await fs.readFile(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = filename.split(".").pop() ?? "";
  const mimeMap: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
  const contentType = mimeMap[ext] ?? "application/octet-stream";

  return new Response(buf, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
