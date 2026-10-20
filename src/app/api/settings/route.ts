import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    let settings = await prisma.gymSettings.findUnique({
      where: { id: "default-settings" },
    });

    if (!settings) {
      settings = await prisma.gymSettings.create({
        data: {
          id: "default-settings",
          gymName: "IronPulse Fitness & Athletic Club",
          address: "104, Elite Avenue, Linking Road, Bandra West, Mumbai, Maharashtra 400050",
          phone: "+91 98201 23456",
          email: "owner@ironpulsefitness.com",
          timezone: "Asia/Kolkata",
          currency: "INR",
          currencySymbol: "₹",
          fyStartMonth: 4,
          defaultTrainerShare: 70.0,
          defaultGymShare: 30.0,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      gymName,
      address,
      phone,
      email,
      timezone,
      currency,
      currencySymbol,
      fyStartMonth,
      defaultTrainerShare,
      defaultGymShare,
      attendancePaidLeave,
      attendanceHalfDayFactor,
    } = body;

    // Validate that trainer + gym share sum to 100
    if (defaultTrainerShare !== undefined || defaultGymShare !== undefined) {
      const t = defaultTrainerShare !== undefined ? Number(defaultTrainerShare) : 70.0;
      const g = defaultGymShare !== undefined ? Number(defaultGymShare) : 30.0;
      if (Math.round((t + g) * 10) / 10 !== 100) {
        return NextResponse.json(
          { error: "Trainer share and Gym share percentages combined must equal 100%" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.gymSettings.upsert({
      where: { id: "default-settings" },
      update: {
        gymName: gymName !== undefined ? gymName : undefined,
        address: address !== undefined ? address : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        timezone: timezone !== undefined ? timezone : undefined,
        currency: currency !== undefined ? currency : undefined,
        currencySymbol: currencySymbol !== undefined ? currencySymbol : undefined,
        fyStartMonth: fyStartMonth !== undefined ? Number(fyStartMonth) : undefined,
        defaultTrainerShare: defaultTrainerShare !== undefined ? Number(defaultTrainerShare) : undefined,
        defaultGymShare: defaultGymShare !== undefined ? Number(defaultGymShare) : undefined,
        attendancePaidLeave: attendancePaidLeave !== undefined ? Boolean(attendancePaidLeave) : undefined,
        attendanceHalfDayFactor: attendanceHalfDayFactor !== undefined ? Number(attendanceHalfDayFactor) : undefined,
      },
      create: {
        id: "default-settings",
        gymName: gymName || "IronPulse Fitness & Athletic Club",
        address: address || "104, Elite Avenue, Linking Road, Bandra West, Mumbai",
        phone: phone || "+91 98201 23456",
        email: email || "owner@ironpulsefitness.com",
        timezone: timezone || "Asia/Kolkata",
        currency: currency || "INR",
        currencySymbol: currencySymbol || "₹",
        fyStartMonth: fyStartMonth ? Number(fyStartMonth) : 4,
        defaultTrainerShare: defaultTrainerShare ? Number(defaultTrainerShare) : 70.0,
        defaultGymShare: defaultGymShare ? Number(defaultGymShare) : 30.0,
      },
    });

    await logAudit({
      action: "UPDATE_SETTINGS",
      entityType: "GYM_SETTINGS",
      entityId: "default-settings",
      details: { updatedFields: body },
      performedById: user?.userId,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
