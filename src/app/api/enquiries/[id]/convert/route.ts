import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calculateOutstandingBalance } from "@/lib/calculations";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const enquiry = await prisma.websiteEnquiry.findUnique({
      where: { id: params.id },
    });

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    if (enquiry.status === "CONVERTED") {
      return NextResponse.json({ error: "This lead has already been converted into a member" }, { status: 400 });
    }

    const {
      fullName = enquiry.fullName,
      phone = enquiry.phone,
      email = enquiry.email,
      planId,
      startDate = new Date().toISOString(),
      price,
      discount = 0,
      amountPaid = 0,
      paymentMethod = "UPI",
      referenceNumber,
      assignedTrainerId,
    } = body;

    if (!planId) {
      return NextResponse.json({ error: "A membership plan must be selected for conversion" }, { status: 400 });
    }

    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Membership plan not found" }, { status: 404 });
    }

    const start = new Date(startDate);
    const end = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const planPrice = Number(price) || plan.defaultPrice;
    const finalAmount = Math.max(0, planPrice - Number(discount || 0));
    const paid = Number(amountPaid || 0);
    const outstandingBalance = calculateOutstandingBalance(finalAmount, paid);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if member already exists with this phone
      let member = await tx.member.findFirst({ where: { phone: phone.trim() } });

      if (!member) {
        const memCount = await tx.member.count();
        const memberCode = `MEM-${(1001 + memCount).toString()}`;
        member = await tx.member.create({
          data: {
            memberCode,
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email?.trim() || null,
            status: "ACTIVE",
            assignedTrainerId: assignedTrainerId || null,
          },
        });
      }

      // 2. Create Membership period
      const membershipRecord = await tx.membershipRecord.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          planName: plan.name,
          startDate: start,
          endDate: end,
          price: planPrice,
          discount: Number(discount || 0),
          finalAmount,
          amountPaid: paid,
          outstandingBalance,
          status: "ACTIVE",
        },
      });

      // 3. Record payment if paid > 0 (Conversion does NOT assume paid unless explicitly recorded)
      let transaction = null;
      if (paid > 0) {
        const txnCount = await tx.transaction.count();
        const transactionCode = `TXN-${(10001 + txnCount).toString()}`;

        transaction = await tx.transaction.create({
          data: {
            transactionCode,
            date: new Date(),
            memberId: member.id,
            membershipRecordId: membershipRecord.id,
            type: "COLLECTION",
            category: "MEMBERSHIP",
            amount: paid,
            paymentMethod,
            referenceNumber: referenceNumber || null,
            description: `Lead Conversion Membership Payment - ${plan.name}`,
            recordedById: user?.userId || null,
          },
        });
      }

      // 4. Update Enquiry status and link to member
      const updatedEnquiry = await tx.websiteEnquiry.update({
        where: { id: enquiry.id },
        data: {
          status: "CONVERTED",
          convertedMemberId: member.id,
          convertedAt: new Date(),
        },
      });

      // 5. Add timeline activity
      await tx.leadActivity.create({
        data: {
          enquiryId: enquiry.id,
          type: "CONVERTED",
          description: `Lead successfully converted to gym member ${member.fullName} (${member.memberCode}). Plan: ${plan.name}`,
          performedById: user?.userId || null,
        },
      });

      return { member, membershipRecord, transaction, enquiry: updatedEnquiry };
    });

    await logAudit({
      action: "CONVERT_LEAD",
      entityType: "LEAD",
      entityId: enquiry.id,
      details: {
        memberId: result.member.id,
        memberCode: result.member.memberCode,
        planName: plan.name,
        amountPaid: paid,
        outstandingBalance,
      },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    console.error("Lead conversion error:", error);
    return NextResponse.json({ error: error.message || "Failed to convert lead" }, { status: 500 });
  }
}
