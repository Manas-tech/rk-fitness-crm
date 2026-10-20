import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const existing = await prisma.membershipPlan.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Membership plan not found" }, { status: 404 });
    }

    const { name, durationDays, defaultPrice, description, isActive } = body;

    const updated = await prisma.membershipPlan.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        durationDays: durationDays !== undefined ? Number(durationDays) : existing.durationDays,
        defaultPrice: defaultPrice !== undefined ? Number(defaultPrice) : existing.defaultPrice,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    await logAudit({
      action: "UPDATE_MEMBERSHIP_PLAN",
      entityType: "MEMBERSHIP_PLAN",
      entityId: updated.id,
      details: {
        previous: { name: existing.name, price: existing.defaultPrice, durationDays: existing.durationDays },
        updated: { name: updated.name, price: updated.defaultPrice, durationDays: updated.durationDays },
      },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    console.error("Failed to update membership plan:", error);
    return NextResponse.json({ error: error.message || "Failed to update membership plan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Membership plan not found" }, { status: 404 });
    }

    // If plan has historical records, soft-delete / deactivate to preserve historical integrity
    if (plan._count.records > 0) {
      const deactivated = await prisma.membershipPlan.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      await logAudit({
        action: "DEACTIVATE_MEMBERSHIP_PLAN",
        entityType: "MEMBERSHIP_PLAN",
        entityId: plan.id,
        details: { reason: "Deactivated because historical member records exist" },
        performedById: user?.userId,
      });

      return NextResponse.json({
        success: true,
        message: "Plan has existing member subscriptions, so it was marked as Inactive instead of deleting historical data.",
        plan: deactivated,
      });
    }

    // Otherwise permanently delete
    await prisma.membershipPlan.delete({
      where: { id: params.id },
    });

    await logAudit({
      action: "DELETE_MEMBERSHIP_PLAN",
      entityType: "MEMBERSHIP_PLAN",
      entityId: plan.id,
      details: { name: plan.name },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, message: "Membership plan deleted successfully." });
  } catch (error: any) {
    console.error("Failed to delete membership plan:", error);
    return NextResponse.json({ error: error.message || "Failed to delete membership plan" }, { status: 500 });
  }
}
