import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "ALL";
    const paymentStatus = searchParams.get("status") || "ALL"; // ALL, PAID, UNPAID
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    const where: any = {};
    if (category !== "ALL") where.category = category;
    if (paymentStatus !== "ALL") where.paymentStatus = paymentStatus;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { vendor: { contains: search } },
        { expenseCode: { contains: search } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
    });

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const paidTotal = expenses.filter((e) => e.paymentStatus === "PAID").reduce((acc, e) => acc + e.amountPaid, 0);
    const unpaidTotal = totalExpenses - paidTotal;

    return NextResponse.json({
      expenses,
      summary: {
        totalExpenses,
        paidTotal,
        unpaidTotal,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      title,
      category = "OTHER",
      amount,
      expenseDate,
      paymentStatus = "PAID",
      paymentMethod = "UPI",
      vendor,
      referenceNumber,
      notes,
    } = body;

    const parsedAmount = Number(amount);
    if (!title || !parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: "Expense title and valid amount are required" }, { status: 400 });
    }

    const isPaid = paymentStatus === "PAID";
    const date = expenseDate ? new Date(expenseDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const expCount = await tx.expense.count();
      const expenseCode = `EXP-${(1001 + expCount).toString()}`;

      const expense = await tx.expense.create({
        data: {
          expenseCode,
          title: title.trim(),
          category,
          amount: parsedAmount,
          expenseDate: date,
          paymentDate: isPaid ? date : null,
          paymentStatus,
          amountPaid: isPaid ? parsedAmount : 0,
          paymentMethod,
          vendor: vendor?.trim() || null,
          referenceNumber: referenceNumber?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      // If marked PAID, create corresponding ledger transaction record
      let transaction = null;
      if (isPaid) {
        const txnCount = await tx.transaction.count();
        const transactionCode = `TXN-${(10001 + txnCount).toString()}`;

        transaction = await tx.transaction.create({
          data: {
            transactionCode,
            date,
            expenseId: expense.id,
            type: "EXPENSE",
            category,
            amount: parsedAmount,
            paymentMethod,
            referenceNumber: referenceNumber || null,
            description: `Expense Payment: ${expense.title}`,
            recordedById: user?.userId || null,
          },
        });
      }

      return { expense, transaction };
    });

    await logAudit({
      action: "CREATE_EXPENSE",
      entityType: "EXPENSE",
      entityId: result.expense.id,
      details: {
        expenseCode: result.expense.expenseCode,
        title: result.expense.title,
        amount: parsedAmount,
        paymentStatus,
      },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: error.message || "Failed to create expense" }, { status: 500 });
  }
}
