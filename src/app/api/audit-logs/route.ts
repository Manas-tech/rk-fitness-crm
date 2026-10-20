import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    });
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
