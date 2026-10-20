/**
 * Core Business Logic & Financial Calculation Engine
 * Designed for accuracy, transparency, and auditability.
 */

export interface AttendanceSummary {
  totalCalendarDays: number;
  scheduledWorkingDays: number;
  presentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  weeklyOffDays: number;
  holidayDays: number;
}

export interface AttendanceSalaryResult {
  dailyRate: number;
  eligibleAttendanceUnits: number;
  attendanceEarnings: number;
  formula: string;
}

/**
 * Calculates attendance units and attendance-based earnings:
 * Daily Rate = Configured Monthly Salary ÷ Configured Scheduled Working Days
 * Eligible Units = Present (1.0) + (Half-days × 0.5) + (Paid leave if policy permits)
 * Attendance Earnings = Eligible Units × Daily Rate
 *
 * Test Case verification:
 * Monthly base: ₹15,000, Scheduled days: 30
 * Present: 27, Half-days: 2, Unpaid absences: 1, Paid leave: 0
 * Daily Rate = 15000 / 30 = 500
 * Eligible Units = 27 + (2 * 0.5) = 28
 * Earnings = 28 * 500 = ₹14,000
 */
export function calculateAttendanceSalary(
  baseSalary: number,
  scheduledWorkingDays: number,
  attendance: {
    presentDays: number;
    halfDays: number;
    paidLeaveDays: number;
    halfDayFactor?: number;
    isPaidLeaveEligible?: boolean;
  }
): AttendanceSalaryResult {
  const safeScheduledDays = scheduledWorkingDays > 0 ? scheduledWorkingDays : 30;
  const halfFactor = attendance.halfDayFactor !== undefined ? attendance.halfDayFactor : 0.5;
  const includePaidLeave = attendance.isPaidLeaveEligible !== undefined ? attendance.isPaidLeaveEligible : true;

  const dailyRate = Math.round((baseSalary / safeScheduledDays) * 100) / 100;

  const paidLeaveUnits = includePaidLeave ? attendance.paidLeaveDays : 0;
  const eligibleAttendanceUnits =
    attendance.presentDays +
    attendance.halfDays * halfFactor +
    paidLeaveUnits;

  const attendanceEarnings = Math.round(eligibleAttendanceUnits * dailyRate * 100) / 100;

  const formula = `Daily Rate: ₹${dailyRate.toFixed(2)} (₹${baseSalary} ÷ ${safeScheduledDays} days) × ${eligibleAttendanceUnits} units = ₹${attendanceEarnings.toFixed(2)}`;

  return {
    dailyRate,
    eligibleAttendanceUnits,
    attendanceEarnings,
    formula,
  };
}

/**
 * PT Revenue-Sharing Calculation:
 * Default: 70% Trainer Share, 30% Gym Share.
 * Critical Rule: Commission is strictly calculated on ACTUAL money received, never on unpaid dues.
 * Refunds or reversals proportionally reduce eligible revenue and commissions.
 */
export interface PtSplitResult {
  eligiblePaymentAmount: number;
  trainerSharePercent: number;
  gymSharePercent: number;
  trainerShareEarned: number;
  gymShareRetained: number;
}

export function calculatePtRevenueSplit(
  paymentAmount: number,
  trainerSharePercent: number = 70.0,
  gymSharePercent: number = 30.0
): PtSplitResult {
  // Ensure the shares sum to 100
  const normalizedTrainerShare = trainerSharePercent;
  const normalizedGymShare = 100.0 - normalizedTrainerShare;

  const trainerShareEarned = Math.round(((paymentAmount * normalizedTrainerShare) / 100.0) * 100) / 100;
  // Gym share is the exact remainder to eliminate any 1-paise rounding discrepancies
  const gymShareRetained = Math.round((paymentAmount - trainerShareEarned) * 100) / 100;

  return {
    eligiblePaymentAmount: paymentAmount,
    trainerSharePercent: normalizedTrainerShare,
    gymSharePercent: normalizedGymShare,
    trainerShareEarned,
    gymShareRetained,
  };
}

/**
 * Outstanding Balance Helper
 * Outstanding Balance = Final Payable Amount − Payments Received
 */
export function calculateOutstandingBalance(finalPayable: number, amountPaid: number): number {
  const balance = Math.round((finalPayable - amountPaid) * 100) / 100;
  return balance > 0 ? balance : 0;
}

/**
 * Reporting Period Date Range Generator
 * Supports:
 * - today
 * - this_week
 * - this_month
 * - this_fy (Indian Financial Year: April 1 to March 31)
 * - this_cy (Calendar Year: Jan 1 to Dec 31)
 * - previous_month
 * - previous_year
 * - custom
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export function getReportingPeriodRange(
  periodType: string,
  customStart?: string,
  customEnd?: string,
  fyStartMonth: number = 4 // April
): DateRange {
  const now = new Date();

  // Set boundary to start and end of day in local time
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (periodType) {
    case "today": {
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        label: "Today",
      };
    }
    case "this_week": {
      const currentDay = now.getDay(); // 0 is Sunday
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        startDate: startOfDay(monday),
        endDate: endOfDay(sunday),
        label: "This Week",
      };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: "This Month",
      };
    }
    case "previous_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: "Previous Month",
      };
    }
    case "this_fy": {
      // Indian Financial Year: April 1 to March 31
      const currentMonth = now.getMonth() + 1; // 1-12
      const fyStartYear = currentMonth >= fyStartMonth ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(fyStartYear, fyStartMonth - 1, 1);
      const end = new Date(fyStartYear + 1, fyStartMonth - 1, 0);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
      };
    }
    case "this_cy": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: `CY ${now.getFullYear()}`,
      };
    }
    case "previous_year": {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: `Year ${now.getFullYear() - 1}`,
      };
    }
    case "custom": {
      const start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = customEnd ? new Date(customEnd) : now;
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: "Custom Range",
      };
    }
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: startOfDay(start),
        endDate: endOfDay(end),
        label: "This Month",
      };
    }
  }
}

/**
 * Currency Formatter for Indian Rupee (₹)
 */
export function formatCurrency(amount: number, symbol: string = "₹"): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${symbol}${rounded.toLocaleString("en-IN", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
