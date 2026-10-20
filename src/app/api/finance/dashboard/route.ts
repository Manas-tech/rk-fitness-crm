import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReportingPeriodRange } from "@/lib/calculations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "this_month";
    const customStart = searchParams.get("customStart") || undefined;
    const customEnd = searchParams.get("customEnd") || undefined;

    // Fetch gym settings for FY start month
    const settings = await prisma.gymSettings.findUnique({ where: { id: "default-settings" } });
    const fyStartMonth = settings?.fyStartMonth || 4;

    const { startDate, endDate, label } = getReportingPeriodRange(
      period,
      customStart,
      customEnd,
      fyStartMonth
    );

    // 1. Fetch Collections / Transactions in period
    const collectionTransactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        type: "COLLECTION",
        status: "COMPLETED",
      },
      include: {
        member: { select: { fullName: true, memberCode: true } },
      },
      orderBy: { date: "desc" },
    });

    const grossCollections = collectionTransactions.reduce((acc, t) => acc + t.amount, 0);

    const membershipCollections = collectionTransactions
      .filter((t) => t.category === "MEMBERSHIP")
      .reduce((acc, t) => acc + t.amount, 0);

    const ptCollections = collectionTransactions
      .filter((t) => t.category === "PT")
      .reduce((acc, t) => acc + t.amount, 0);

    const otherSales = collectionTransactions
      .filter((t) => t.category === "OTHER_SALES")
      .reduce((acc, t) => acc + t.amount, 0);

    // 2. Fetch Actual Paid Expenses in period
    // Accounting Rule: Only actual paid cash expenses in the period reduce cash flow.
    const paidExpenses = await prisma.expense.findMany({
      where: {
        expenseDate: { gte: startDate, lte: endDate },
        paymentStatus: "PAID",
      },
    });

    // Also include any settled salary transactions in this period
    const salaryPayoutTransactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        type: "PAYOUT",
        category: "SALARY",
        status: "COMPLETED",
      },
    });

    const directExpenseTotal = paidExpenses.reduce((acc, e) => acc + e.amountPaid, 0);
    const salaryPayoutTotal = salaryPayoutTransactions.reduce((acc, t) => acc + t.amount, 0);

    // Total Operating Expenses (ensuring no double-counting)
    const totalExpenses = directExpenseTotal + salaryPayoutTotal;

    // Net Operating Cash Flow
    const netOperatingCashFlow = grossCollections - totalExpenses;

    // 3. Outstanding Member Dues (total across active memberships & PT contracts)
    const activeMemberships = await prisma.membershipRecord.findMany({
      where: { status: "ACTIVE" },
      select: { outstandingBalance: true },
    });
    const membershipDues = activeMemberships.reduce((acc, m) => acc + m.outstandingBalance, 0);

    const activePtContracts = await prisma.ptContract.findMany({
      where: { status: "ACTIVE" },
      select: { outstandingBalance: true },
    });
    const ptDues = activePtContracts.reduce((acc, p) => acc + p.outstandingBalance, 0);

    const totalOutstandingDues = membershipDues + ptDues;

    // 4. PT Trainer Commission Metrics in period
    const commissionsInPeriod = await prisma.ptCommissionRecord.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const trainerCommissionEarned = commissionsInPeriod.reduce((acc, c) => acc + c.trainerShareEarned, 0);
    const trainerCommissionPaid = commissionsInPeriod
      .filter((c) => c.settlementStatus === "SETTLED_IN_PAYROLL" || c.settlementStatus === "PAID_DIRECTLY")
      .reduce((acc, c) => acc + c.trainerShareEarned, 0);

    const allPendingCommissions = await prisma.ptCommissionRecord.findMany({
      where: { settlementStatus: "PENDING" },
    });
    const pendingTrainerCommission = allPendingCommissions.reduce((acc, c) => acc + c.trainerShareEarned, 0);

    // 5. Chart 1: Collections vs Expenses Series
    // Group by date
    const dateMap: Record<string, { date: string; collections: number; expenses: number }> = {};

    collectionTransactions.forEach((t) => {
      const d = t.date.toISOString().split("T")[0];
      if (!dateMap[d]) dateMap[d] = { date: d, collections: 0, expenses: 0 };
      dateMap[d].collections += t.amount;
    });

    paidExpenses.forEach((e) => {
      const d = e.expenseDate.toISOString().split("T")[0];
      if (!dateMap[d]) dateMap[d] = { date: d, collections: 0, expenses: 0 };
      dateMap[d].expenses += e.amountPaid;
    });

    salaryPayoutTransactions.forEach((s) => {
      const d = s.date.toISOString().split("T")[0];
      if (!dateMap[d]) dateMap[d] = { date: d, collections: 0, expenses: 0 };
      dateMap[d].expenses += s.amount;
    });

    const collectionsVsExpensesChart = Object.values(dateMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // 6. Chart 2: Revenue Breakdown
    const revenueBreakdown = [
      { name: "Membership", value: membershipCollections, color: "#167D5A" },
      { name: "Personal Training", value: ptCollections, color: "#2563EB" },
      { name: "Other Sales", value: otherSales, color: "#F59E0B" },
    ].filter((item) => item.value > 0);

    // 7. Chart 3: Expense Breakdown by Category
    const expenseCatMap: Record<string, number> = {};
    paidExpenses.forEach((e) => {
      expenseCatMap[e.category] = (expenseCatMap[e.category] || 0) + e.amountPaid;
    });
    if (salaryPayoutTotal > 0) {
      expenseCatMap["SALARY"] = (expenseCatMap["SALARY"] || 0) + salaryPayoutTotal;
    }

    const expenseBreakdown = Object.entries(expenseCatMap).map(([category, value]) => ({
      name: category,
      value,
    }));

    // 8. Chart 5: Membership Performance
    const newMemberships = await prisma.membershipRecord.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const renewals = await prisma.membershipRecord.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        member: {
          membershipRecords: {
            some: {
              createdAt: { lt: startDate },
            },
          },
        },
      },
    });

    const expiredMemberships = await prisma.membershipRecord.count({
      where: {
        endDate: { gte: startDate, lte: endDate },
      },
    });

    // 9. Recent Transactions (last 10)
    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { date: "desc" },
      include: {
        member: { select: { fullName: true, memberCode: true } },
      },
    });

    return NextResponse.json({
      periodLabel: label,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      kpis: {
        grossCollections,
        membershipCollections,
        ptCollections,
        otherSales,
        totalExpenses,
        netOperatingCashFlow,
        totalOutstandingDues,
        membershipDues,
        ptDues,
        trainerCommissionEarned,
        trainerCommissionPaid,
        pendingTrainerCommission,
      },
      charts: {
        collectionsVsExpenses: collectionsVsExpensesChart,
        revenueBreakdown,
        expenseBreakdown,
        membershipPerformance: [
          { name: "New Memberships", count: newMemberships - renewals > 0 ? newMemberships - renewals : newMemberships },
          { name: "Renewals", count: renewals },
          { name: "Expired Memberships", count: expiredMemberships },
        ],
      },
      recentTransactions,
    });
  } catch (error: any) {
    console.error("Dashboard calculation error:", error);
    return NextResponse.json({ error: "Failed to generate financial dashboard" }, { status: 500 });
  }
}
