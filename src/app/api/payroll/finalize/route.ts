import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { month, year, staffPayrolls } = body;

    if (!month || !year || !Array.isArray(staffPayrolls) || staffPayrolls.length === 0) {
      return NextResponse.json({ error: "Month, year, and payroll records are required" }, { status: 400 });
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const finalizedRecords = await prisma.$transaction(async (tx) => {
      const records = [];

      for (const item of staffPayrolls) {
        // Upsert finalized snapshot for this staff, month, year
        const payroll = await tx.payrollRecord.upsert({
          where: {
            staffId_month_year: {
              staffId: item.staffId,
              month,
              year,
            },
          },
          update: {
            status: "FINALIZED",
            totalCalendarDays: item.totalCalendarDays,
            scheduledWorkingDays: item.scheduledWorkingDays,
            presentDays: item.presentDays,
            halfDays: item.halfDays,
            paidLeaveDays: item.paidLeaveDays,
            unpaidLeaveDays: item.unpaidLeaveDays,
            absentDays: item.absentDays,
            attendanceUnitsEarned: item.attendanceUnitsEarned,
            dailyRate: item.dailyRate,
            baseSalary: item.baseSalary,
            attendanceEarnings: item.attendanceEarnings,
            ptCommissionEarned: item.ptCommissionEarned,
            adjustments: item.adjustments || 0,
            deductions: item.deductions || 0,
            grossPayable: item.grossPayable,
            netSalaryPayable: item.netSalaryPayable,
            remainingBalance: item.netSalaryPayable - (item.amountPaid || 0),
            finalizedAt: new Date(),
            finalizedById: user?.userId || null,
          },
          create: {
            staffId: item.staffId,
            month,
            year,
            status: "FINALIZED",
            totalCalendarDays: item.totalCalendarDays,
            scheduledWorkingDays: item.scheduledWorkingDays,
            presentDays: item.presentDays,
            halfDays: item.halfDays,
            paidLeaveDays: item.paidLeaveDays,
            unpaidLeaveDays: item.unpaidLeaveDays,
            absentDays: item.absentDays,
            attendanceUnitsEarned: item.attendanceUnitsEarned,
            dailyRate: item.dailyRate,
            baseSalary: item.baseSalary,
            attendanceEarnings: item.attendanceEarnings,
            ptCommissionEarned: item.ptCommissionEarned,
            adjustments: item.adjustments || 0,
            deductions: item.deductions || 0,
            grossPayable: item.grossPayable,
            netSalaryPayable: item.netSalaryPayable,
            amountPaid: 0,
            remainingBalance: item.netSalaryPayable,
            finalizedAt: new Date(),
            finalizedById: user?.userId || null,
          },
        });

        // Lock included PT Commission records to this payroll
        // They can NEVER be added to another payroll
        if (item.ptCommissionEarned > 0) {
          await tx.ptCommissionRecord.updateMany({
            where: {
              trainerId: item.staffId,
              settlementStatus: "PENDING",
              createdAt: { gte: startOfMonth, lte: endOfMonth },
            },
            data: {
              settlementStatus: "SETTLED_IN_PAYROLL",
              payrollRecordId: payroll.id,
            },
          });
        }

        records.push(payroll);
      }

      return records;
    });

    await logAudit({
      action: "FINALIZE_PAYROLL",
      entityType: "PAYROLL",
      entityId: `${year}-${month}`,
      details: { month, year, staffCount: finalizedRecords.length },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, count: finalizedRecords.length, records: finalizedRecords });
  } catch (error: any) {
    console.error("Payroll finalization error:", error);
    return NextResponse.json({ error: error.message || "Failed to finalize payroll" }, { status: 500 });
  }
}
