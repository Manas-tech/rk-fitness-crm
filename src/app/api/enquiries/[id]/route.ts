import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const enquiry = await prisma.websiteEnquiry.findUnique({
      where: { id: params.id },
      include: {
        assignedStaff: true,
        convertedMember: true,
        activities: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    return NextResponse.json({ enquiry });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch enquiry details" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const existing = await prisma.websiteEnquiry.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const { status, assignedStaffId, nextFollowUpDate, note, newActivityType, newActivityDescription } = body;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.websiteEnquiry.update({
        where: { id: params.id },
        data: {
          status: status !== undefined ? status : existing.status,
          assignedStaffId: assignedStaffId !== undefined ? (assignedStaffId || null) : existing.assignedStaffId,
          nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : existing.nextFollowUpDate,
          notes: note !== undefined ? note : existing.notes,
        },
      });

      // If status changed or activity logged, add to timeline
      if (status && status !== existing.status) {
        await tx.leadActivity.create({
          data: {
            enquiryId: existing.id,
            type: "STATUS_CHANGE",
            description: `Status changed from ${existing.status} to ${status}`,
            performedById: user?.userId || null,
          },
        });
      }

      if (newActivityDescription) {
        await tx.leadActivity.create({
          data: {
            enquiryId: existing.id,
            type: newActivityType || "NOTE",
            description: newActivityDescription.trim(),
            performedById: user?.userId || null,
          },
        });
      }

      return updated;
    });

    await logAudit({
      action: "UPDATE_ENQUIRY",
      entityType: "LEAD",
      entityId: existing.id,
      details: { previousStatus: existing.status, newStatus: status },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, enquiry: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update enquiry" }, { status: 500 });
  }
}
