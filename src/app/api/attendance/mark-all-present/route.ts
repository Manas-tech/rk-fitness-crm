import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const allStaff = await prisma.staff.findMany({
      where: { employmentStatus: "ACTIVE" },
    });

    const markedRecords = [];

    for (const staff of allStaff) {
      const record = await prisma.attendanceRecord.upsert({
        where: {
          staffId_date: {
            staffId: staff.id,
            date,
          },
        },
        update: {
          status: "PRESENT",
          attendanceUnits: 1.0,
          checkInTime: "08:00 AM",
          checkOutTime: "05:00 PM",
          workingHours: 8.0,
          markedById: user?.userId || null,
        },
        create: {
          staffId: staff.id,
          date,
          status: "PRESENT",
          attendanceUnits: 1.0,
          checkInTime: "08:00 AM",
          checkOutTime: "05:00 PM",
          workingHours: 8.0,
          markedById: user?.userId || null,
        },
      });
      markedRecords.push(record);
    }

    await logAudit({
      action: "MARK_ALL_PRESENT",
      entityType: "ATTENDANCE",
      entityId: date,
      details: { count: markedRecords.length, date },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, count: markedRecords.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to mark all present" }, { status: 500 });
  }
}
