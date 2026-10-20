import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "ALL"; // ALL, COLLECTION, EXPENSE, PAYOUT
    const category = searchParams.get("category") || "ALL";
    const paymentMethod = searchParams.get("paymentMethod") || "ALL";
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (type !== "ALL") where.type = type;
    if (category !== "ALL") where.category = category;
    if (paymentMethod !== "ALL") where.paymentMethod = paymentMethod;

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    if (search) {
      where.OR = [
        { transactionCode: { contains: search } },
        { description: { contains: search } },
        { referenceNumber: { contains: search } },
        { member: { fullName: { contains: search } } },
        { member: { memberCode: { contains: search } } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        member: { select: { fullName: true, memberCode: true, phone: true } },
        ptContract: { select: { contractCode: true } },
        membershipRecord: { select: { planName: true } },
        expense: { select: { expenseCode: true, title: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      amount,
      category = "OTHER_SALES",
      paymentMethod = "UPI",
      referenceNumber,
      description,
      memberId,
      notes,
    } = body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0 || !description) {
      return NextResponse.json({ error: "Valid amount and description are required" }, { status: 400 });
    }

    const txnCount = await prisma.transaction.count();
    const transactionCode = `TXN-${(10001 + txnCount).toString()}`;

    const transaction = await prisma.transaction.create({
      data: {
        transactionCode,
        date: new Date(),
        memberId: memberId || null,
        type: "COLLECTION",
        category,
        amount: parsedAmount,
        paymentMethod,
        referenceNumber: referenceNumber || null,
        description: description.trim(),
        notes: notes || null,
        recordedById: user?.userId || null,
      },
    });

    await logAudit({
      action: "CREATE_MANUAL_TRANSACTION",
      entityType: "PAYMENT",
      entityId: transaction.id,
      details: { transactionCode, amount: parsedAmount, category, description },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, transaction }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record transaction" }, { status: 500 });
  }
}
