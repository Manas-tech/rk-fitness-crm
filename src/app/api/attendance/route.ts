import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const roleFilter = searchParams.get("role") || "ALL";

    const staffWhere: any = { employmentStatus: "ACTIVE" };
    if (roleFilter !== "ALL") {
      staffWhere.role = roleFilter;
    }

    const allStaff = await prisma.staff.findMany({
      where: staffWhere,
      orderBy: { fullName: "asc" },
    });

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { date: dateStr },
    });

    const attendanceMap = new Map(attendanceRecords.map((r) => [r.staffId, r]));

    // Combine staff with their record or mark as NOT_MARKED
    const staffAttendance = allStaff.map((s) => {
      const record = attendanceMap.get(s.id);
      return {
        staffId: s.id,
        staffCode: s.staffCode,
        fullName: s.fullName,
        role: s.role,
        salaryModel: s.salaryModel,
        attendanceStatus: record ? record.status : "NOT_MARKED",
        attendanceUnits: record ? record.attendanceUnits : null,
        checkInTime: record?.checkInTime || null,
        checkOutTime: record?.checkOutTime || null,
        workingHours: record?.workingHours || null,
        notes: record?.notes || null,
        recordId: record?.id || null,
      };
    });

    const counts = {
      total: staffAttendance.length,
      present: staffAttendance.filter((s) => s.attendanceStatus === "PRESENT").length,
      halfDay: staffAttendance.filter((s) => s.attendanceStatus === "HALF_DAY").length,
      leave: staffAttendance.filter((s) => s.attendanceStatus === "LEAVE").length,
      absent: staffAttendance.filter((s) => s.attendanceStatus === "ABSENT").length,
      weeklyOff: staffAttendance.filter((s) => s.attendanceStatus === "WEEKLY_OFF" || s.attendanceStatus === "HOLIDAY").length,
      notMarked: staffAttendance.filter((s) => s.attendanceStatus === "NOT_MARKED").length,
    };

    return NextResponse.json({ date: dateStr, staffAttendance, counts });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { staffId, date, status, checkInTime, checkOutTime, workingHours, notes } = body;

    if (!staffId || !date || !status) {
      return NextResponse.json({ error: "Staff, date, and attendance status are required" }, { status: 400 });
    }

    // Determine units based on status
    let attendanceUnits = 0.0;
    if (status === "PRESENT") attendanceUnits = 1.0;
    else if (status === "HALF_DAY") attendanceUnits = 0.5;
    else if (status === "LEAVE" || status === "HOLIDAY" || status === "WEEKLY_OFF") attendanceUnits = 1.0;
    else if (status === "ABSENT") attendanceUnits = 0.0;

    // Upsert attendance record to guarantee uniqueness on [staffId, date]
    const record = await prisma.attendanceRecord.upsert({
      where: {
        staffId_date: {
          staffId,
          date,
        },
      },
      update: {
        status,
        attendanceUnits,
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        workingHours: workingHours ? Number(workingHours) : null,
        notes: notes || null,
        markedById: user?.userId || null,
      },
      create: {
        staffId,
        date,
        status,
        attendanceUnits,
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        workingHours: workingHours ? Number(workingHours) : null,
        notes: notes || null,
        markedById: user?.userId || null,
      },
    });

    await logAudit({
      action: "MARK_ATTENDANCE",
      entityType: "ATTENDANCE",
      entityId: record.id,
      details: { staffId, date, status, attendanceUnits },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    console.error("Attendance marking error:", error);
    return NextResponse.json({ error: error.message || "Failed to mark attendance" }, { status: 500 });
  }
}
