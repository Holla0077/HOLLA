/**
 * GET /api/withdraw/momo/status?ref=<referenceId>
 *
 * Poll MTN MoMo disbursement status for a pending withdrawal.
 * On FAILED: refunds the deducted balance.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { getDisbursementStatus } from "@/lib/mtn-momo";
import { sendTransactionEmail } from "@/lib/email";

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

    const withReq = await prisma.withdrawRequest.findFirst({
      where: { externalRef: ref, userId: session.id },
    });
    if (!withReq) return bad("Withdrawal request not found", 404);

    if (withReq.status === "COMPLETED") {
      return NextResponse.json({ status: "COMPLETED", message: "Withdrawal completed successfully." });
    }
    if (withReq.status === "FAILED") {
      return NextResponse.json({ status: "FAILED", message: withReq.failureReason || "Withdrawal failed. Your balance has been refunded." });
    }

    const momoStatus = await getDisbursementStatus(ref);

    if (momoStatus.status === "SUCCESSFUL") {
      await prisma.withdrawRequest.update({
        where: { id: withReq.id },
        data: { status: "COMPLETED", providerStatus: "SUCCESSFUL" },
      });
      if (withReq.transactionId) {
        await prisma.transaction.update({ where: { id: withReq.transactionId }, data: { status: "COMPLETED" } });
      }
      const ghsAmount = `GH₵ ${(Number(withReq.amount) / 100).toFixed(2)}`;
      prisma.user.findUnique({ where: { id: session.id }, select: { email: true, username: true } })
        .then((u) => u && sendTransactionEmail({
          to: u.email,
          username: u.username,
          type: "withdraw",
          amount: ghsAmount,
          reference: ref,
          method: `${withReq.network} MoMo`,
          note: `Sent to ${withReq.phone}`,
        }))
        .catch(console.error);

      return NextResponse.json({ status: "COMPLETED", message: "Withdrawal sent to your MoMo wallet." });
    }

    if (momoStatus.status === "FAILED") {
      // Refund balance
      await prisma.$transaction(async (db) => {
        await db.wallet.update({
          where: { id: withReq.walletId },
          data: { balance: { increment: withReq.amount } },
        });
        await db.withdrawRequest.update({
          where: { id: withReq.id },
          data: { status: "FAILED", providerStatus: "FAILED", failureReason: momoStatus.reason },
        });
        if (withReq.transactionId) {
          await db.transaction.update({ where: { id: withReq.transactionId }, data: { status: "FAILED" } });
        }
      });
      return NextResponse.json({ status: "FAILED", message: momoStatus.reason || "Withdrawal failed. Your balance has been refunded." });
    }

    return NextResponse.json({ status: "PENDING", message: "Processing your withdrawal…" });
  } catch (e) {
    console.error("[withdraw/momo/status]", e);
    return bad(e instanceof Error ? e.message : "Status check failed", 500);
  }
}
