import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculateOutstandingBalance } from "@/lib/calculations";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      planId,
      startDate,
      price,
      discount = 0,
      amountPaid = 0,
      paymentMethod = "UPI",
      referenceNumber,
    } = body;

    const member = await prisma.member.findUnique({ where: { id: params.id } });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Selected plan not found" }, { status: 404 });
    }

    const start = new Date(startDate || new Date());
    const end = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const planPrice = Number(price) || plan.defaultPrice;
    const finalAmount = Math.max(0, planPrice - Number(discount || 0));
    const paid = Number(amountPaid || 0);
    const outstandingBalance = calculateOutstandingBalance(finalAmount, paid);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark existing active records as expired or completed to preserve history
      await tx.membershipRecord.updateMany({
        where: { memberId: params.id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });

      // 2. Reactivate member status to ACTIVE
      await tx.member.update({
        where: { id: params.id },
        data: { status: "ACTIVE", deactivationReason: null },
      });

      // 3. Create the brand new renewal period
      const newMembershipRecord = await tx.membershipRecord.create({
        data: {
          memberId: params.id,
          planId: plan.id,
          planName: plan.name,
          startDate: start,
          endDate: end,
          price: planPrice,
          discount: Number(discount || 0),
          finalAmount,
          amountPaid: paid,
          outstandingBalance,
          status: "ACTIVE",
        },
      });

      // 4. Record renewal payment if paid > 0
      let transaction = null;
      if (paid > 0) {
        const txnCount = await tx.transaction.count();
        const transactionCode = `TXN-${(10001 + txnCount).toString()}`;

        transaction = await tx.transaction.create({
          data: {
            transactionCode,
            date: new Date(),
            memberId: params.id,
            membershipRecordId: newMembershipRecord.id,
            type: "COLLECTION",
            category: "MEMBERSHIP",
            amount: paid,
            paymentMethod,
            referenceNumber: referenceNumber || null,
            description: `Membership Renewal - ${plan.name}`,
            recordedById: user?.userId || null,
          },
        });
      }

      return { newMembershipRecord, transaction };
    });

    await logAudit({
      action: "RENEW_MEMBERSHIP",
      entityType: "MEMBER",
      entityId: member.id,
      details: {
        planName: plan.name,
        finalAmount,
        amountPaid: paid,
        outstandingBalance,
      },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Failed to renew membership:", error);
    return NextResponse.json({ error: error.message || "Failed to renew membership" }, { status: 500 });
  }
}
