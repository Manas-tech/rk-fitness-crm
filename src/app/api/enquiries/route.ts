import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Server-side validation schema for website enquiry submissions
const enquirySubmissionSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  interestedService: z.enum([
    "GYM_MEMBERSHIP",
    "PERSONAL_TRAINING",
    "CROSSFIT",
    "YOGA",
    "GENERAL_ENQUIRY",
  ]).default("GYM_MEMBERSHIP"),
  preferredPlanName: z.string().optional().or(z.literal("")),
  message: z.string().max(1000).optional().or(z.literal("")),
  source: z.string().default("WEBSITE"),
});

// Simple in-memory rate-limiter: max 10 submissions per IP per 5 minutes
const ipSubmissionTracker = new Map<string, { count: number; resetAt: number }>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL"; // ALL, NEW, CONTACTED, FOLLOW_UP_REQUIRED, TRIAL_SCHEDULED, CONVERTED, LOST
    const source = searchParams.get("source") || "ALL";
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    const where: any = {};
    if (status !== "ALL") where.status = status;
    if (source !== "ALL") where.source = source;

    if (search) {
      where.OR = [
        { leadCode: { contains: search } },
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const enquiries = await prisma.websiteEnquiry.findMany({
      where,
      include: {
        assignedStaff: { select: { id: true, fullName: true, staffCode: true } },
        convertedMember: { select: { id: true, memberCode: true, fullName: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 3 },
      },
      orderBy: { createdAt: "desc" },
    });

    // Counts for enquiry dashboard header
    const totalCount = await prisma.websiteEnquiry.count();
    const newCount = await prisma.websiteEnquiry.count({ where: { status: "NEW" } });
    const contactedCount = await prisma.websiteEnquiry.count({ where: { status: "CONTACTED" } });
    const followUpCount = await prisma.websiteEnquiry.count({ where: { status: "FOLLOW_UP_REQUIRED" } });
    const trialCount = await prisma.websiteEnquiry.count({ where: { status: "TRIAL_SCHEDULED" } });
    const convertedCount = await prisma.websiteEnquiry.count({ where: { status: "CONVERTED" } });
    const lostCount = await prisma.websiteEnquiry.count({ where: { status: "LOST" } });

    return NextResponse.json({
      enquiries,
      counts: {
        total: totalCount,
        new: newCount,
        contacted: contactedCount,
        followUpDue: followUpCount,
        trialScheduled: trialCount,
        converted: convertedCount,
        lost: lostCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch enquiries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Abuse Protection / Rate limiting check
    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const now = Date.now();
    const tracker = ipSubmissionTracker.get(clientIp);

    if (tracker) {
      if (tracker.resetAt > now) {
        if (tracker.count >= 10) {
          return NextResponse.json(
            { error: "Too many submissions. Please wait 5 minutes before submitting again." },
            { status: 429 }
          );
        }
        tracker.count += 1;
      } else {
        ipSubmissionTracker.set(clientIp, { count: 1, resetAt: now + 5 * 60 * 1000 });
      }
    } else {
      ipSubmissionTracker.set(clientIp, { count: 1, resetAt: now + 5 * 60 * 1000 });
    }

    // 2. Validate request body
    const body = await req.json();
    const validatedData = enquirySubmissionSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validatedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fullName, phone, email, interestedService, preferredPlanName, message, source } =
      validatedData.data;

    // 3. Generate unique lead code
    const leadCount = await prisma.websiteEnquiry.count();
    const leadCode = `LEAD-${(1001 + leadCount).toString()}`;

    // 4. Save to database with initial activity record
    const enquiry = await prisma.$transaction(async (tx) => {
      const newEnquiry = await tx.websiteEnquiry.create({
        data: {
          leadCode,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          interestedService,
          preferredPlanName: preferredPlanName?.trim() || null,
          message: message?.trim() || null,
          source: source || "WEBSITE",
          status: "NEW",
        },
      });

      await tx.leadActivity.create({
        data: {
          enquiryId: newEnquiry.id,
          type: "NOTE",
          description: `Enquiry received from ${source} for ${interestedService.replace(/_/g, " ")}.`,
        },
      });

      return newEnquiry;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for reaching out! A fitness consultant will contact you shortly.",
        leadCode: enquiry.leadCode,
        id: enquiry.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Enquiry submission error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit enquiry" }, { status: 500 });
  }
}
