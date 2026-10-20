import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const existing = await prisma.expense.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const { paymentStatus, paymentMethod = "UPI", referenceNumber } = body;

    const result = await prisma.$transaction(async (tx) => {
      let transaction = null;

      // If transitioning from UNPAID to PAID, record payment transaction
      if (existing.paymentStatus !== "PAID" && paymentStatus === "PAID") {
        const txnCount = await tx.transaction.count();
        const transactionCode = `TXN-${(10001 + txnCount).toString()}`;

        transaction = await tx.transaction.create({
          data: {
            transactionCode,
            date: new Date(),
            expenseId: existing.id,
            type: "EXPENSE",
            category: existing.category,
            amount: existing.amount,
            paymentMethod,
            referenceNumber: referenceNumber || null,
            description: `Expense Payment: ${existing.title}`,
            recordedById: user?.userId || null,
          },
        });
      }

      const updated = await tx.expense.update({
        where: { id: params.id },
        data: {
          paymentStatus: paymentStatus || existing.paymentStatus,
          paymentDate: paymentStatus === "PAID" ? new Date() : existing.paymentDate,
          amountPaid: paymentStatus === "PAID" ? existing.amount : existing.amountPaid,
          paymentMethod: paymentMethod || existing.paymentMethod,
          referenceNumber: referenceNumber || existing.referenceNumber,
        },
      });

      return { updated, transaction };
    });

    await logAudit({
      action: "UPDATE_EXPENSE",
      entityType: "EXPENSE",
      entityId: existing.id,
      details: { previousStatus: existing.paymentStatus, newStatus: paymentStatus },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update expense" }, { status: 500 });
  }
}
