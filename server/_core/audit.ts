
import * as db from "../db";

// Helper for audit logging - extracts IP from context
export async function logAudit(
    userId: number,
    action: string,
    entityType?: string,
    entityId?: number,
    details?: string,
    ctx?: any
) {
    let ipAddress: string | undefined;
    if (ctx?.req) {
        // Get IP from X-Forwarded-For (nginx), X-Real-IP, or req.ip
        const xForwardedFor = ctx.req.headers?.['x-forwarded-for'];
        if (xForwardedFor) {
            ipAddress = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0].trim();
        } else if (ctx.req.headers?.['x-real-ip']) {
            ipAddress = ctx.req.headers['x-real-ip'] as string;
        } else if (ctx.req.ip) {
            ipAddress = ctx.req.ip;
        }
    }

    // Fallback: Check if ctx has ip directly (legacy)
    if (!ipAddress && ctx?.ip) {
        ipAddress = ctx.ip;
    }

    await db.createAuditLog({
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress
    });
}
