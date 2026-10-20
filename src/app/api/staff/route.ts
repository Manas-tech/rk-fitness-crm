import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      include: {
        assignedMembers: { select: { id: true, fullName: true, memberCode: true } },
        ptContracts: {
          where: { status: "ACTIVE" },
          select: { id: true, contractCode: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ staff });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
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
      role = "PERSONAL_TRAINER",
      salaryModel = "ATTENDANCE_BASED",
      baseSalary = 15000,
      scheduledWorkingDays = 30,
      expectedWorkingHours = 8.0,
      bankDetails,
      notes,
    } = body;

    if (!fullName || !phone) {
      return NextResponse.json({ error: "Full name and phone are required" }, { status: 400 });
    }

    const staffCount = await prisma.staff.count();
    const staffCode = `STF-${(101 + staffCount).toString()}`;

    const newStaff = await prisma.staff.create({
      data: {
        staffCode,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        role,
        salaryModel,
        baseSalary: Number(baseSalary) || 15000,
        scheduledWorkingDays: Number(scheduledWorkingDays) || 30,
        expectedWorkingHours: Number(expectedWorkingHours) || 8.0,
        bankDetails: bankDetails?.trim() || null,
        notes: notes?.trim() || null,
        employmentStatus: "ACTIVE",
      },
    });

    await logAudit({
      action: "CREATE_STAFF",
      entityType: "STAFF",
      entityId: newStaff.id,
      details: { staffCode, fullName, role, salaryModel, baseSalary },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, staff: newStaff }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create staff member" }, { status: 500 });
  }
}
