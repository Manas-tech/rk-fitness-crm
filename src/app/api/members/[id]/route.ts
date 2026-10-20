import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const member = await prisma.member.findUnique({
      where: { id: params.id },
      include: {
        assignedTrainer: true,
        membershipRecords: {
          include: {
            plan: true,
            transactions: {
              orderBy: { date: "desc" },
            },
          },
          orderBy: { startDate: "desc" },
        },
        ptContracts: {
          include: {
            trainer: true,
            transactions: true,
            commissionRecords: true,
          },
          orderBy: { startDate: "desc" },
        },
        transactions: {
          orderBy: { date: "desc" },
        },
        enquiries: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch member details" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const existing = await prisma.member.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const {
      fullName,
      phone,
      email,
      gender,
      dateOfBirth,
      address,
      emergencyContact,
      status,
      deactivationReason,
      assignedTrainerId,
      internalNotes,
    } = body;

    const updated = await prisma.member.update({
      where: { id: params.id },
      data: {
        fullName: fullName !== undefined ? fullName.trim() : existing.fullName,
        phone: phone !== undefined ? phone.trim() : existing.phone,
        email: email !== undefined ? (email ? email.trim() : null) : existing.email,
        gender: gender !== undefined ? gender : existing.gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existing.dateOfBirth,
        address: address !== undefined ? address : existing.address,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : existing.emergencyContact,
        status: status !== undefined ? status : existing.status,
        deactivationReason: deactivationReason !== undefined ? deactivationReason : existing.deactivationReason,
        assignedTrainerId: assignedTrainerId !== undefined ? (assignedTrainerId || null) : existing.assignedTrainerId,
        internalNotes: internalNotes !== undefined ? internalNotes : existing.internalNotes,
      },
    });

    await logAudit({
      action: "UPDATE_MEMBER",
      entityType: "MEMBER",
      entityId: updated.id,
      details: { changes: body },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update member" }, { status: 500 });
  }
}
