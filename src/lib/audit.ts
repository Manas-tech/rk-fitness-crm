import { prisma } from "./prisma";

export async function logAudit(params: {
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  performedById?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details ? JSON.stringify(params.details) : null,
        performedById: params.performedById || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
