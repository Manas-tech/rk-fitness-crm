import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const plans = await prisma.membershipPlan.findMany({
      orderBy: { durationDays: "asc" },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });
    return NextResponse.json({ plans });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { name, durationDays, defaultPrice, description } = body;

    if (!name || !durationDays || !defaultPrice) {
      return NextResponse.json(
        { error: "Plan name, duration (days), and default price are required" },
        { status: 400 }
      );
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        name: name.trim(),
        durationDays: Number(durationDays),
        defaultPrice: Number(defaultPrice),
        description: description?.trim() || null,
        isActive: true,
      },
    });

    await logAudit({
      action: "CREATE_MEMBERSHIP_PLAN",
      entityType: "MEMBERSHIP_PLAN",
      entityId: plan.id,
      details: { name: plan.name, durationDays: plan.durationDays, defaultPrice: plan.defaultPrice },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, plan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create plan" }, { status: 500 });
  }
}
