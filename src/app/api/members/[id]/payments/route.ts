import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculateOutstandingBalance } from "@/lib/calculations";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { amount, paymentMethod = "UPI", referenceNumber, notes } = body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
    }

    // Find the latest active membership record for this member
    const activeRecord = await prisma.membershipRecord.findFirst({
      where: { memberId: params.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    if (!activeRecord) {
      return NextResponse.json(
        { error: "No active membership record found to record payment against" },
        { status: 404 }
      );
    }

    if (activeRecord.outstandingBalance <= 0) {
      return NextResponse.json(
        { error: "This membership has already been fully paid with zero outstanding balance" },
        { status: 400 }
      );
    }

    const newAmountPaid = activeRecord.amountPaid + paymentAmount;
    const newOutstandingBalance = calculateOutstandingBalance(activeRecord.finalAmount, newAmountPaid);

    const result = await prisma.$transaction(async (tx) => {
      const txnCount = await tx.transaction.count();
      const transactionCode = `TXN-${(10001 + txnCount).toString()}`;

      const transaction = await tx.transaction.create({
        data: {
          transactionCode,
          date: new Date(),
          memberId: params.id,
          membershipRecordId: activeRecord.id,
          type: "COLLECTION",
          category: "MEMBERSHIP",
          amount: paymentAmount,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          description: `Membership Due Payment - ${activeRecord.planName}`,
          notes: notes || null,
          recordedById: user?.userId || null,
        },
      });

      const updatedRecord = await tx.membershipRecord.update({
        where: { id: activeRecord.id },
        data: {
          amountPaid: newAmountPaid,
          outstandingBalance: newOutstandingBalance,
        },
      });

      return { transaction, updatedRecord };
    });

    await logAudit({
      action: "RECORD_PAYMENT",
      entityType: "PAYMENT",
      entityId: result.transaction.id,
      details: {
        memberId: params.id,
        amount: paymentAmount,
        newBalance: newOutstandingBalance,
      },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Failed to record member payment:", error);
    return NextResponse.json({ error: error.message || "Failed to record payment" }, { status: 500 });
  }
}
