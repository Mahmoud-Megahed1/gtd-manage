import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, createAuditLog } from "../db";
import { approvalRequests } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// Only admin/finance_manager can review
const reviewerProcedure = protectedProcedure.use(({ ctx, next }) => {
    const allowedRoles = ['admin', 'finance_manager'];
    if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح لك بمراجعة الطلبات' });
    }
    return next({ ctx });
});

export const approvalsRouter = router({
    // List pending approval requests (for reviewers)
    pending: reviewerProcedure.query(async () => {
        const db = await getDb();
        if (!db) return [];
        return await db.select().from(approvalRequests)
            .where(eq(approvalRequests.status, 'pending'))
            .orderBy(desc(approvalRequests.requestedAt));
    }),

    // List all approval requests
    list: reviewerProcedure
        .input(z.object({
            status: z.enum(['pending', 'approved', 'rejected']).optional()
        }).optional())
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) return [];

            if (input?.status) {
                return await db.select().from(approvalRequests)
                    .where(eq(approvalRequests.status, input.status))
                    .orderBy(desc(approvalRequests.requestedAt));
            }

            return await db.select().from(approvalRequests)
                .orderBy(desc(approvalRequests.requestedAt));
        }),

    // Get my requests (for accountants to see their own)
    myRequests: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];
        return await db.select().from(approvalRequests)
            .where(eq(approvalRequests.requestedBy, ctx.user.id))
            .orderBy(desc(approvalRequests.requestedAt));
    }),

    // Create approval request (for accountants)
    create: protectedProcedure
        .input(z.object({
            entityType: z.enum(['expense', 'sale', 'purchase', 'invoice', 'boq', 'installment']),
            entityId: z.number().optional(), // Optional for new creates
            action: z.enum(['create', 'update', 'delete', 'cancel', 'approve']),
            requestData: z.string() // JSON string of the data
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            await db.insert(approvalRequests).values({
                entityType: input.entityType,
                entityId: input.entityId || 0,
                action: input.action,
                requestData: input.requestData,
                status: 'pending',
                requestedBy: ctx.user.id,
                requestedAt: new Date()
            });

            await createAuditLog({
                userId: ctx.user.id,
                action: 'CREATE_APPROVAL_REQUEST',
                entityType: 'approval',
                details: `طلب ${input.action} على ${input.entityType}`
            });

            // Notify admins about new pending request
            await notifyOwner({
                title: '📋 طلب اعتماد جديد',
                content: `طلب ${input.action === 'create' ? 'إنشاء' : input.action === 'update' ? 'تعديل' : input.action === 'delete' ? 'حذف' : input.action} على ${input.entityType} - يحتاج مراجعة`
            }).catch(() => { });

            return { success: true, message: 'تم إرسال الطلب للمراجعة' };
        }),

    // Approve request
    approve: reviewerProcedure
        .input(z.object({
            id: z.number(),
            notes: z.string().optional()
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            // Get the request
            const [request] = await db.select().from(approvalRequests)
                .where(eq(approvalRequests.id, input.id)).limit(1);

            if (!request) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'الطلب غير موجود' });
            }

            if (request.status !== 'pending') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'الطلب تمت معالجته مسبقاً' });
            }

            // Update the request status
            await db.update(approvalRequests)
                .set({
                    status: 'approved',
                    reviewedBy: ctx.user.id,
                    reviewedAt: new Date(),
                    reviewNotes: input.notes
                })
                .where(eq(approvalRequests.id, input.id));

            // TODO: Execute the actual action based on request type
            // This would involve calling the appropriate service

            await createAuditLog({
                userId: ctx.user.id,
                action: 'APPROVE_REQUEST',
                entityType: 'approval',
                entityId: input.id,
                details: `تمت الموافقة على الطلب #${input.id}`
            });

            return { success: true, message: 'تمت الموافقة على الطلب' };
        }),

    // Reject request
    reject: reviewerProcedure
        .input(z.object({
            id: z.number(),
            notes: z.string().min(1, 'يجب إضافة سبب الرفض')
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            // Get the request
            const [request] = await db.select().from(approvalRequests)
                .where(eq(approvalRequests.id, input.id)).limit(1);

            if (!request) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'الطلب غير موجود' });
            }

            if (request.status !== 'pending') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'الطلب تمت معالجته مسبقاً' });
            }

            await db.update(approvalRequests)
                .set({
                    status: 'rejected',
                    reviewedBy: ctx.user.id,
                    reviewedAt: new Date(),
                    reviewNotes: input.notes
                })
                .where(eq(approvalRequests.id, input.id));

            await createAuditLog({
                userId: ctx.user.id,
                action: 'REJECT_REQUEST',
                entityType: 'approval',
                entityId: input.id,
                details: `تم رفض الطلب #${input.id}: ${input.notes}`
            });

            return { success: true, message: 'تم رفض الطلب' };
        }),

    // Count pending (for badge)
    pendingCount: reviewerProcedure.query(async () => {
        const db = await getDb();
        if (!db) return { count: 0 };

        const result = await db.select().from(approvalRequests)
            .where(eq(approvalRequests.status, 'pending'));

        return { count: result.length };
    })
});
