import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculatePtRevenueSplit, calculateOutstandingBalance } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trainerId = searchParams.get("trainerId") || "ALL";
    const status = searchParams.get("status") || "ALL"; // ALL, ACTIVE, COMPLETED, CANCELLED
    const goal = searchParams.get("goal") || "ALL";
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    const where: any = {};

    if (trainerId !== "ALL") {
      where.trainerId = trainerId;
    }

    if (status !== "ALL") {
      where.status = status;
    }

    if (goal !== "ALL") {
      where.goalCategory = goal;
    }

    if (search) {
      where.OR = [
        { contractCode: { contains: search } },
        { member: { fullName: { contains: search } } },
        { member: { memberCode: { contains: search } } },
        { trainer: { fullName: { contains: search } } },
      ];
    }

    const contracts = await prisma.ptContract.findMany({
      where,
      include: {
        member: {
          select: { id: true, fullName: true, memberCode: true, phone: true },
        },
        trainer: {
          select: { id: true, fullName: true, staffCode: true, role: true },
        },
        transactions: {
          orderBy: { date: "desc" },
        },
        commissionRecords: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute PT summary stats
    const totalActivePt = await prisma.ptContract.count({ where: { status: "ACTIVE" } });
    const allCommissionRecords = await prisma.ptCommissionRecord.findMany();
    const totalEligiblePtRevenue = allCommissionRecords.reduce((sum, r) => sum + r.eligibleRevenue, 0);
    const totalTrainerShareEarned = allCommissionRecords.reduce((sum, r) => sum + r.trainerShareEarned, 0);
    const totalGymShareRetained = allCommissionRecords.reduce((sum, r) => sum + r.gymShareRetained, 0);
    const pendingCommissionPayouts = allCommissionRecords
      .filter((r) => r.settlementStatus === "PENDING")
      .reduce((sum, r) => sum + r.trainerShareEarned, 0);

    return NextResponse.json({
      contracts,
      summary: {
        totalActivePt,
        totalEligiblePtRevenue,
        totalTrainerShareEarned,
        totalGymShareRetained,
        pendingCommissionPayouts,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch PT contracts:", error);
    return NextResponse.json({ error: "Failed to fetch PT contracts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      memberId,
      // Optional new member creation inline
      newMemberData,
      trainerId,
      goalCategory = "WEIGHT_LOSS",
      goalDescription,
      packageBasis = "MONTHLY",
      totalSessions = 12,
      startDate,
      endDate,
      contractAmount,
      discount = 0,
      amountPaid = 0,
      paymentMethod = "UPI",
      referenceNumber,
      notes,
    } = body;

    if (!trainerId || !contractAmount || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Trainer, agreed contract amount, start date, and end date are required" },
        { status: 400 }
      );
    }

    // Get gym default commission split
    const settings = await prisma.gymSettings.findUnique({ where: { id: "default-settings" } });
    const trainerSharePercent = settings?.defaultTrainerShare || 70.0;
    const gymSharePercent = settings?.defaultGymShare || 30.0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalAmount = Number(contractAmount);
    const disc = Number(discount || 0);
    const finalPayable = Math.max(0, totalAmount - disc);
    const paid = Number(amountPaid || 0);
    const outstandingBalance = calculateOutstandingBalance(finalPayable, paid);

    const result = await prisma.$transaction(async (tx) => {
      let resolvedMemberId = memberId;

      // Create new member inline if provided
      if (!resolvedMemberId && newMemberData) {
        const memCount = await tx.member.count();
        const memberCode = `MEM-${(1001 + memCount).toString()}`;
        const newMember = await tx.member.create({
          data: {
            memberCode,
            fullName: newMemberData.fullName.trim(),
            phone: newMemberData.phone.trim(),
            email: newMemberData.email?.trim() || null,
            status: "ACTIVE",
            assignedTrainerId: trainerId,
          },
        });
        resolvedMemberId = newMember.id;
      }

      if (!resolvedMemberId) {
        throw new Error("A valid member must be selected or created");
      }

      const ptCount = await tx.ptContract.count();
      const contractCode = `PT-${(1001 + ptCount).toString()}`;

      const ptContract = await tx.ptContract.create({
        data: {
          contractCode,
          memberId: resolvedMemberId,
          trainerId,
          goalCategory,
          goalDescription: goalDescription || null,
          packageBasis,
          totalSessions: Number(totalSessions) || 12,
          completedSessions: 0,
          startDate: start,
          endDate: end,
          contractAmount: totalAmount,
          discount: disc,
          finalPayable,
          amountPaid: paid,
          outstandingBalance,
          trainerSharePercent,
          gymSharePercent,
          status: "ACTIVE",
          notes: notes || null,
        },
      });

      // Update member's assigned trainer if not already set
      await tx.member.update({
        where: { id: resolvedMemberId },
        data: { assignedTrainerId: trainerId },
      });

      // Record transaction and commission split ONLY IF paid > 0
      let transaction = null;
      let commissionRecord = null;

      if (paid > 0) {
        const txnCount = await tx.transaction.count();
        const transactionCode = `TXN-${(10001 + txnCount).toString()}`;

        transaction = await tx.transaction.create({
          data: {
            transactionCode,
            date: new Date(),
            memberId: resolvedMemberId,
            ptContractId: ptContract.id,
            type: "COLLECTION",
            category: "PT",
            amount: paid,
            paymentMethod,
            referenceNumber: referenceNumber || null,
            description: `Personal Training Contract Initial Payment - ${contractCode}`,
            recordedById: user?.userId || null,
          },
        });

        // Calculate commission strictly on actual money received
        const split = calculatePtRevenueSplit(paid, trainerSharePercent, gymSharePercent);

        commissionRecord = await tx.ptCommissionRecord.create({
          data: {
            ptContractId: ptContract.id,
            transactionId: transaction.id,
            trainerId,
            paymentAmountReceived: paid,
            eligibleRevenue: paid,
            trainerSharePercent: split.trainerSharePercent,
            gymSharePercent: split.gymSharePercent,
            trainerShareEarned: split.trainerShareEarned,
            gymShareRetained: split.gymShareRetained,
            settlementStatus: "PENDING",
          },
        });
      }

      return { ptContract, transaction, commissionRecord };
    });

    await logAudit({
      action: "CREATE_PT_CONTRACT",
      entityType: "PT",
      entityId: result.ptContract.id,
      details: {
        contractCode: result.ptContract.contractCode,
        trainerId,
        finalPayable,
        amountPaid: paid,
        outstandingBalance,
      },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create PT contract:", error);
    return NextResponse.json({ error: error.message || "Failed to create PT contract" }, { status: 500 });
  }
}
