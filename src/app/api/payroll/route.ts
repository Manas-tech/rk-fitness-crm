import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAttendanceSalary } from "@/lib/calculations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || (now.getMonth() + 1).toString(), 10);
    const year = parseInt(searchParams.get("year") || now.getFullYear().toString(), 10);

    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const datePrefix = `${year}-${monthStr}`;

    // Total calendar days in this month
    const totalCalendarDays = new Date(year, month, 0).getDate();

    // Fetch all active staff
    const allStaff = await prisma.staff.findMany({
      where: { employmentStatus: "ACTIVE" },
      orderBy: { fullName: "asc" },
    });

    // Check if payroll records already exist for this month/year
    const existingPayrolls = await prisma.payrollRecord.findMany({
      where: { month, year },
      include: {
        commissionItems: true,
        payoutTransactions: { orderBy: { date: "desc" } },
      },
    });

    const payrollMap = new Map(existingPayrolls.map((p) => [p.staffId, p]));

    const payrollResults = [];

    for (const staff of allStaff) {
      const existing = payrollMap.get(staff.id);

      // If payroll is already FINALIZED or PAID, return the locked snapshot!
      if (existing && existing.status !== "DRAFT") {
        payrollResults.push({
          staffId: staff.id,
          staffCode: staff.staffCode,
          fullName: staff.fullName,
          role: staff.role,
          salaryModel: staff.salaryModel,
          isFinalized: true,
          payrollId: existing.id,
          status: existing.status,
          totalCalendarDays: existing.totalCalendarDays,
          scheduledWorkingDays: existing.scheduledWorkingDays,
          presentDays: existing.presentDays,
          halfDays: existing.halfDays,
          paidLeaveDays: existing.paidLeaveDays,
          unpaidLeaveDays: existing.unpaidLeaveDays,
          absentDays: existing.absentDays,
          attendanceUnitsEarned: existing.attendanceUnitsEarned,
          dailyRate: existing.dailyRate,
          baseSalary: existing.baseSalary,
          attendanceEarnings: existing.attendanceEarnings,
          ptCommissionEarned: existing.ptCommissionEarned,
          adjustments: existing.adjustments,
          deductions: existing.deductions,
          grossPayable: existing.grossPayable,
          netSalaryPayable: existing.netSalaryPayable,
          amountPaid: existing.amountPaid,
          remainingBalance: existing.remainingBalance,
          finalizedAt: existing.finalizedAt,
          notes: existing.notes,
          commissionItems: existing.commissionItems,
          payoutTransactions: existing.payoutTransactions,
        });
        continue;
      }

      // Dynamic calculation for DRAFT / PREVIEW
      // 1. Fetch attendance records for this staff in this month
      const attendance = await prisma.attendanceRecord.findMany({
        where: {
          staffId: staff.id,
          date: { startsWith: datePrefix },
        },
      });

      const presentDays = attendance.filter((a) => a.status === "PRESENT").length;
      const halfDays = attendance.filter((a) => a.status === "HALF_DAY").length;
      const paidLeaveDays = attendance.filter((a) => a.status === "LEAVE" || a.status === "HOLIDAY" || a.status === "WEEKLY_OFF").length;
      const absentDays = attendance.filter((a) => a.status === "ABSENT").length;
      const scheduledWorkingDays = staff.scheduledWorkingDays || 30;

      // 2. Base salary & attendance earnings
      let dailyRate = 0;
      let attendanceUnitsEarned = 0;
      let attendanceEarnings = 0;
      let formula = "";

      if (staff.salaryModel === "ATTENDANCE_BASED") {
        const calc = calculateAttendanceSalary(staff.baseSalary, scheduledWorkingDays, {
          presentDays,
          halfDays,
          paidLeaveDays,
        });
        dailyRate = calc.dailyRate;
        attendanceUnitsEarned = calc.eligibleAttendanceUnits;
        attendanceEarnings = calc.attendanceEarnings;
        formula = calc.formula;
      } else if (staff.salaryModel === "FIXED_MONTHLY") {
        dailyRate = Math.round((staff.baseSalary / scheduledWorkingDays) * 100) / 100;
        // In fixed monthly, deduct only unpaid absences
        const unpaidDeductions = absentDays * dailyRate;
        attendanceEarnings = Math.max(0, staff.baseSalary - unpaidDeductions);
        attendanceUnitsEarned = scheduledWorkingDays - absentDays;
        formula = `Fixed Salary: ₹${staff.baseSalary} - Unpaid Absences (${absentDays} × ₹${dailyRate}) = ₹${attendanceEarnings}`;
      } else if (staff.salaryModel === "HYBRID") {
        const calc = calculateAttendanceSalary(staff.baseSalary, scheduledWorkingDays, {
          presentDays,
          halfDays,
          paidLeaveDays,
        });
        dailyRate = calc.dailyRate;
        attendanceUnitsEarned = calc.eligibleAttendanceUnits;
        attendanceEarnings = calc.attendanceEarnings;
        formula = `Hybrid Attendance Units: ${attendanceUnitsEarned} × ₹${dailyRate} = ₹${attendanceEarnings}`;
      } else {
        // COMMISSION_ONLY
        dailyRate = 0;
        attendanceEarnings = 0;
        formula = "Commission only (no base compensation)";
      }

      // 3. Fetch eligible unfinalized PT Commissions for this trainer in this month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      const pendingCommissions = await prisma.ptCommissionRecord.findMany({
        where: {
          trainerId: staff.id,
          settlementStatus: "PENDING",
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        include: {
          ptContract: { select: { contractCode: true, member: { select: { fullName: true } } } },
        },
      });

      const ptCommissionEarned = pendingCommissions.reduce((sum, c) => sum + c.trainerShareEarned, 0);

      // 4. Gross & Net payable
      const grossPayable = Math.round((attendanceEarnings + ptCommissionEarned) * 100) / 100;
      const netSalaryPayable = grossPayable;

      payrollResults.push({
        staffId: staff.id,
        staffCode: staff.staffCode,
        fullName: staff.fullName,
        role: staff.role,
        salaryModel: staff.salaryModel,
        isFinalized: false,
        payrollId: existing?.id || null,
        status: "DRAFT",
        totalCalendarDays,
        scheduledWorkingDays,
        presentDays,
        halfDays,
        paidLeaveDays,
        unpaidLeaveDays: absentDays,
        absentDays,
        attendanceUnitsEarned,
        dailyRate,
        baseSalary: staff.baseSalary,
        attendanceEarnings,
        ptCommissionEarned,
        adjustments: 0,
        deductions: 0,
        grossPayable,
        netSalaryPayable,
        amountPaid: 0,
        remainingBalance: netSalaryPayable,
        formula,
        commissionItems: pendingCommissions,
        payoutTransactions: [],
      });
    }

    const totalGross = payrollResults.reduce((sum, p) => sum + p.grossPayable, 0);
    const totalCommissions = payrollResults.reduce((sum, p) => sum + p.ptCommissionEarned, 0);
    const totalBasePaid = payrollResults.reduce((sum, p) => sum + p.attendanceEarnings, 0);
    const allFinalized = payrollResults.every((p) => p.isFinalized);

    return NextResponse.json({
      month,
      year,
      totalCalendarDays,
      isAllFinalized: allFinalized,
      summary: {
        totalGross,
        totalBasePaid,
        totalCommissions,
        staffCount: payrollResults.length,
      },
      payroll: payrollResults,
    });
  } catch (error: any) {
    console.error("Payroll calculation error:", error);
    return NextResponse.json({ error: error.message || "Failed to calculate payroll" }, { status: 500 });
  }
}
