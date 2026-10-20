import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculateOutstandingBalance } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "ALL"; // ALL, ACTIVE, NON_ACTIVE, EXPIRED, DEACTIVATED
    const planId = searchParams.get("planId") || "ALL";
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const expiryFilter = searchParams.get("expiry"); // 7_days, 30_days, expired
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Build Prisma where conditions
    const where: any = {};

    // Filter 1: Status
    if (statusFilter === "ACTIVE") {
      where.status = "ACTIVE";
    } else if (statusFilter === "NON_ACTIVE") {
      where.status = { in: ["EXPIRED", "DEACTIVATED"] };
    } else if (statusFilter === "EXPIRED") {
      where.status = "EXPIRED";
    } else if (statusFilter === "DEACTIVATED") {
      where.status = "DEACTIVATED";
    }

    // Filter 2: Plan
    if (planId !== "ALL") {
      where.membershipRecords = {
        some: {
          planId: planId,
          status: "ACTIVE",
        },
      };
    }

    // Search
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { memberCode: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Expiry Alerts Filter
    if (expiryFilter === "7_days") {
      where.membershipRecords = {
        some: {
          status: "ACTIVE",
          endDate: { gte: now, lte: sevenDaysFromNow },
        },
      };
    } else if (expiryFilter === "30_days") {
      where.membershipRecords = {
        some: {
          status: "ACTIVE",
          endDate: { gte: now, lte: thirtyDaysFromNow },
        },
      };
    } else if (expiryFilter === "expired") {
      where.OR = [
        { status: "EXPIRED" },
        {
          membershipRecords: {
            some: {
              endDate: { lt: now },
            },
          },
        },
      ];
    }

    const members = await prisma.member.findMany({
      where,
      include: {
        assignedTrainer: {
          select: { id: true, fullName: true, staffCode: true },
        },
        membershipRecords: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            plan: true,
          },
        },
        ptContracts: {
          where: { status: "ACTIVE" },
          select: { id: true, contractCode: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    // Compute KPI metrics for header
    const totalMembers = await prisma.member.count();
    const activeMembers = await prisma.member.count({ where: { status: "ACTIVE" } });
    const expiredMembers = await prisma.member.count({ where: { status: "EXPIRED" } });
    const deactivatedMembers = await prisma.member.count({ where: { status: "DEACTIVATED" } });

    const expiringIn7 = await prisma.membershipRecord.count({
      where: {
        status: "ACTIVE",
        endDate: { gte: now, lte: sevenDaysFromNow },
      },
    });

    const expiringIn30 = await prisma.membershipRecord.count({
      where: {
        status: "ACTIVE",
        endDate: { gte: now, lte: thirtyDaysFromNow },
      },
    });

    return NextResponse.json({
      members,
      counts: {
        total: totalMembers,
        active: activeMembers,
        expired: expiredMembers,
        deactivated: deactivatedMembers,
        expiringIn7,
        expiringIn30,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      fullName,
      phone,
      email,
      gender,
      dateOfBirth,
      address,
      emergencyContact,
      planId,
      startDate,
      price,
      discount = 0,
      amountPaid = 0,
      paymentMethod = "UPI",
      assignedTrainerId,
      internalNotes,
      allowDuplicatePhone = false,
    } = body;

    if (!fullName || !phone || !planId || !startDate) {
      return NextResponse.json(
        { error: "Full name, phone, membership plan, and start date are required" },
        { status: 400 }
      );
    }

    // Check duplicate phone
    const existingPhone = await prisma.member.findFirst({
      where: { phone: phone.trim() },
    });

    if (existingPhone && !allowDuplicatePhone) {
      return NextResponse.json(
        {
          warning: "DUPLICATE_PHONE",
          message: `A member with phone ${phone} already exists (${existingPhone.fullName} - ${existingPhone.memberCode}). Confirm if you want to proceed with this shared number.`,
          existingMember: {
            id: existingPhone.id,
            name: existingPhone.fullName,
            code: existingPhone.memberCode,
          },
        },
        { status: 409 }
      );
    }

    // Fetch plan details
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Selected membership plan not found" }, { status: 404 });
    }

    const start = new Date(startDate);
    const end = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const planPrice = Number(price) || plan.defaultPrice;
    const finalAmount = Math.max(0, planPrice - Number(discount || 0));
    const paid = Number(amountPaid || 0);
    const outstandingBalance = calculateOutstandingBalance(finalAmount, paid);

    // Generate unique member code
    const memberCount = await prisma.member.count();
    const memberCode = `MEM-${(1001 + memberCount).toString()}`;

    // Execute atomic transaction for member, membership period, and initial payment
    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          memberCode,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          gender: gender || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          address: address || null,
          emergencyContact: emergencyContact || null,
          status: "ACTIVE",
          assignedTrainerId: assignedTrainerId || null,
          internalNotes: internalNotes || null,
        },
      });

      const membershipRecord = await tx.membershipRecord.create({
        data: {
          memberId: member.id,
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

      if (paid > 0) {
        const txnCount = await tx.transaction.count();
        const transactionCode = `TXN-${(10001 + txnCount).toString()}`;

        await tx.transaction.create({
          data: {
            transactionCode,
            date: new Date(),
            memberId: member.id,
            membershipRecordId: membershipRecord.id,
            type: "COLLECTION",
            category: "MEMBERSHIP",
            amount: paid,
            paymentMethod,
            description: `${plan.name} - Initial Membership Payment`,
            recordedById: user?.userId || null,
          },
        });
      }

      return { member, membershipRecord };
    });

    await logAudit({
      action: "CREATE_MEMBER",
      entityType: "MEMBER",
      entityId: result.member.id,
      details: { memberCode, fullName, planName: plan.name, amountPaid: paid, outstandingBalance },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, member: result.member }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create member:", error);
    return NextResponse.json({ error: error.message || "Failed to create member" }, { status: 500 });
  }
}
