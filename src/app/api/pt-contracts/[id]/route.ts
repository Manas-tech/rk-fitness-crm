import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const contract = await prisma.ptContract.findUnique({
      where: { id: params.id },
      include: {
        member: true,
        trainer: true,
        transactions: {
          orderBy: { date: "desc" },
        },
        commissionRecords: {
          orderBy: { createdAt: "desc" },
          include: {
            payrollRecord: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "PT contract not found" }, { status: 404 });
    }

    return NextResponse.json({ contract });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch PT contract details" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const existing = await prisma.ptContract.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "PT contract not found" }, { status: 404 });
    }

    const {
      status,
      completedSessions,
      goalDescription,
      notes,
    } = body;

    const updated = await prisma.ptContract.update({
      where: { id: params.id },
      data: {
        status: status !== undefined ? status : existing.status,
        completedSessions: completedSessions !== undefined ? Number(completedSessions) : existing.completedSessions,
        goalDescription: goalDescription !== undefined ? goalDescription : existing.goalDescription,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    await logAudit({
      action: "UPDATE_PT_CONTRACT",
      entityType: "PT",
      entityId: updated.id,
      details: { changes: body },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, contract: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update PT contract" }, { status: 500 });
  }
}
