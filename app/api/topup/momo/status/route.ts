/**
 * GET /api/topup/momo/status?ref=<referenceId>
 *
 * Poll the MTN MoMo status of a pending collection and, on success, credit the wallet.
 * The frontend calls this every few seconds until it gets COMPLETED or FAILED.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { getCollectionStatus } from "@/lib/mtn-momo";

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return bad("Unauthorized", 401);

    const url = new URL(req.url);
    const ref = url.searchParams.get("ref");
    if (!ref) return bad("ref (referenceId) is required");

    const topupReq = await prisma.topupRequest.findFirst({
      where: { externalRef: ref, userId: session.id },
    });
    if (!topupReq) return bad("Topup request not found", 404);

    // Already resolved — return cached status
    if (topupReq.status === "COMPLETED") {
      return NextResponse.json({ status: "COMPLETED", message: "Payment successful. Your wallet has been credited." });
    }
    if (topupReq.status === "FAILED") {
      return NextResponse.json({ status: "FAILED", message: topupReq.failureReason || "Payment failed." });
    }

    // Poll MTN
    const momoStatus = await getCollectionStatus(ref);

    if (momoStatus.status === "SUCCESSFUL") {
      // Credit the wallet atomically
      await prisma.$transaction(async (db) => {
        await db.wallet.update({
          where: { id: topupReq.walletId },
          data: { balance: { increment: topupReq.amount } },
        });

        await db.topupRequest.update({
          where: { id: topupReq.id },
          data: { status: "COMPLETED", providerStatus: "SUCCESSFUL" },
        });

        if (topupReq.transactionId) {
          await db.transaction.update({
            where: { id: topupReq.transactionId },
            data: {
              status: "COMPLETED",
              metadata: {
                topupRequestId: topupReq.id,
                phone: topupReq.phone,
                network: topupReq.network,
                type: "TOPUP",
                financialTransactionId: momoStatus.financialTransactionId,
              },
            },
          });
        }
      });

      return NextResponse.json({
        status: "COMPLETED",
        message: `GH₵ ${(Number(topupReq.amount) / 100).toFixed(2)} has been added to your wallet.`,
      });
    }

    if (momoStatus.status === "FAILED") {
      await prisma.topupRequest.update({
        where: { id: topupReq.id },
        data: { status: "FAILED", providerStatus: "FAILED", failureReason: momoStatus.reason },
      });
      if (topupReq.transactionId) {
        await prisma.transaction.update({ where: { id: topupReq.transactionId }, data: { status: "FAILED" } });
      }
      return NextResponse.json({ status: "FAILED", message: momoStatus.reason || "Payment was declined or timed out." });
    }

    return NextResponse.json({ status: "PENDING", message: "Waiting for approval on your phone…" });
  } catch (e) {
    console.error("[topup/momo/status]", e);
    return bad(e instanceof Error ? e.message : "Status check failed", 500);
  }
}
