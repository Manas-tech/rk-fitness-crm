import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { amount, paymentMethod = "BANK_TRANSFER", referenceNumber, notes } = body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ error: "Valid payout amount is required" }, { status: 400 });
    }

    const payroll = await prisma.payrollRecord.findUnique({
      where: { id: params.id },
      include: { staff: true },
    });

    if (!payroll) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
    }

    if (payroll.remainingBalance <= 0) {
      return NextResponse.json({ error: "This salary has already been paid in full" }, { status: 400 });
    }

    if (paymentAmount > payroll.remainingBalance) {
      return NextResponse.json(
        { error: `Payout amount cannot exceed remaining balance of ₹${payroll.remainingBalance}` },
        { status: 400 }
      );
    }

    const newAmountPaid = payroll.amountPaid + paymentAmount;
    const newRemainingBalance = Math.round((payroll.netSalaryPayable - newAmountPaid) * 100) / 100;
    const newStatus = newRemainingBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

    const result = await prisma.$transaction(async (tx) => {
      const txnCount = await tx.transaction.count();
      const transactionCode = `TXN-${(10001 + txnCount).toString()}`;

      // Create ledger transaction for salary payout
      const transaction = await tx.transaction.create({
        data: {
          transactionCode,
          date: new Date(),
          payrollRecordId: payroll.id,
          type: "PAYOUT",
          category: "SALARY",
          amount: paymentAmount,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          description: `Salary Payout to ${payroll.staff.fullName} (${payroll.month}/${payroll.year})`,
          notes: notes || null,
          recordedById: user?.userId || null,
        },
      });

      const updatedPayroll = await tx.payrollRecord.update({
        where: { id: payroll.id },
        data: {
          amountPaid: newAmountPaid,
          remainingBalance: newRemainingBalance,
          status: newStatus,
        },
      });

      return { transaction, updatedPayroll };
    });

    await logAudit({
      action: "RECORD_SALARY_PAYOUT",
      entityType: "PAYROLL",
      entityId: payroll.id,
      details: {
        staffName: payroll.staff.fullName,
        amount: paymentAmount,
        newRemainingBalance,
        status: newStatus,
      },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Salary payout error:", error);
    return NextResponse.json({ error: error.message || "Failed to record salary payout" }, { status: 500 });
  }
}
