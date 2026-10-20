import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculatePtRevenueSplit, calculateOutstandingBalance } from "@/lib/calculations";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { amount, paymentMethod = "UPI", referenceNumber, notes } = body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
    }

    const contract = await prisma.ptContract.findUnique({
      where: { id: params.id },
      include: { trainer: true },
    });

    if (!contract) {
      return NextResponse.json({ error: "PT contract not found" }, { status: 404 });
    }

    if (contract.outstandingBalance <= 0) {
      return NextResponse.json(
        { error: "This PT contract has already been fully paid with zero outstanding balance" },
        { status: 400 }
      );
    }

    const newAmountPaid = contract.amountPaid + paymentAmount;
    const newOutstandingBalance = calculateOutstandingBalance(contract.finalPayable, newAmountPaid);

    // Calculate commission strictly on actual money received
    const split = calculatePtRevenueSplit(
      paymentAmount,
      contract.trainerSharePercent,
      contract.gymSharePercent
    );

    const result = await prisma.$transaction(async (tx) => {
      const txnCount = await tx.transaction.count();
      const transactionCode = `TXN-${(10001 + txnCount).toString()}`;

      const transaction = await tx.transaction.create({
        data: {
          transactionCode,
          date: new Date(),
          memberId: contract.memberId,
          ptContractId: contract.id,
          type: "COLLECTION",
          category: "PT",
          amount: paymentAmount,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          description: `PT Installment Payment - ${contract.contractCode}`,
          notes: notes || null,
          recordedById: user?.userId || null,
        },
      });

      const commissionRecord = await tx.ptCommissionRecord.create({
        data: {
          ptContractId: contract.id,
          transactionId: transaction.id,
          trainerId: contract.trainerId,
          paymentAmountReceived: paymentAmount,
          eligibleRevenue: paymentAmount,
          trainerSharePercent: split.trainerSharePercent,
          gymSharePercent: split.gymSharePercent,
          trainerShareEarned: split.trainerShareEarned,
          gymShareRetained: split.gymShareRetained,
          settlementStatus: "PENDING",
        },
      });

      const updatedContract = await tx.ptContract.update({
        where: { id: contract.id },
        data: {
          amountPaid: newAmountPaid,
          outstandingBalance: newOutstandingBalance,
        },
      });

      return { transaction, commissionRecord, updatedContract };
    });

    await logAudit({
      action: "RECORD_PT_PAYMENT",
      entityType: "PT",
      entityId: contract.id,
      details: {
        paymentAmount,
        trainerShareEarned: split.trainerShareEarned,
        gymShareRetained: split.gymShareRetained,
        remainingBalance: newOutstandingBalance,
      },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Failed to record PT payment:", error);
    return NextResponse.json({ error: error.message || "Failed to record payment" }, { status: 500 });
  }
}
