/**
 * Audit log writer.
 *
 * Call logAudit() whenever an admin views or modifies sensitive data.
 * All writes are best-effort (failures are logged to console, not re-thrown)
 * so that an audit failure never blocks the main operation.
 */

import { prisma } from "./prisma";

export type AuditAction =
  | "CREATE_REGISTRATION"
  | "VIEW_REGISTRATION"
  | "UPDATE_REGISTRATION"
  | "DELETE_REGISTRATION"
  | "VIEW_PASSPORT"
  | "EXPORT_MANIFEST"
  | "UPDATE_PAYMENT"
  | "CREATE_EVENT"
  | "UPDATE_EVENT"
  | "CREATE_PRICING"
  | "UPDATE_PRICING"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "ADMIN_LOGIN"
  | "ADMIN_LOGOUT"
  | "DATA_PURGE";

export interface AuditParams {
  userId?: string | null;
  action: AuditAction;
  targetTable: string;
  targetId: string;
  ipAddress?: string | null;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        targetTable: params.targetTable,
        targetId: params.targetId,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit failure must not break the caller — log to console only
    console.error("[audit] Failed to write audit log:", err);
  }
}

/**
 * Extract client IP from a Next.js Request.
 *
 * Priority:
 * 1. x-vercel-forwarded-for — set by Vercel infrastructure, cannot be spoofed
 * 2. x-forwarded-for — first value (client IP when behind a single proxy)
 * 3. x-real-ip — fallback for some reverse proxies (e.g. nginx)
 * 4. "unknown" — no IP could be determined
 */
export function getClientIp(request: Request): string {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    return vercelForwarded.split(",")[0].trim();
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}
