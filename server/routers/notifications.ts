import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import * as demo from "../_core/demoStore";

// Helper function to create notifications - can be imported by other routers
export async function createNotification(params: {
    userId: number;
    fromUserId?: number;
    type?: 'info' | 'warning' | 'success' | 'action';
    title: string;
    message?: string;
    link?: string;
    entityType?: string;
    entityId?: number;
    groupKey?: string;
}) {
    const db = await getDb();
    if (!db) {
        demo.insert("notifications", {
            ...params,
            type: params.type || 'info',
            isRead: 0,
            createdAt: new Date()
        });
        return;
    }

    await db.insert(notifications).values({
        userId: params.userId,
        fromUserId: params.fromUserId || null,
        type: params.type || 'info',
        title: params.title,
        message: params.message || null,
        link: params.link || null,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        groupKey: params.groupKey || null,
    });
}

// Create notification for multiple users at once
export async function createNotificationForRoles(params: {
    roles: string[];
    fromUserId?: number;
    type?: 'info' | 'warning' | 'success' | 'action';
    title: string;
    message?: string;
    link?: string;
    entityType?: string;
    entityId?: number;
}) {
    const db = await getDb();
    if (!db) return;

    // Get all users with specified roles
    const { users } = await import("../../drizzle/schema");
    const targetUsers = await db.select({ id: users.id })
        .from(users)
        .where(sql`role IN (${params.roles.map(r => `'${r}'`).join(',')})`);

    // Create notification for each user
    for (const user of targetUsers) {
        await createNotification({
            userId: user.id,
            ...params
        });
    }
}

export const notificationsRouter = router({
    // List notifications for current user
    list: protectedProcedure
        .input(z.object({
            limit: z.number().default(50),
            unreadOnly: z.boolean().default(false)
        }).optional())
        .query(async ({ ctx, input }) => {
            const db = await getDb();
            const limit = input?.limit || 50;
            const unreadOnly = input?.unreadOnly || false;

            if (!db) {
                let items = demo.list("notifications")
                    .filter((n: any) => n.userId === ctx.user.id);
                if (unreadOnly) {
                    items = items.filter((n: any) => !n.isRead);
                }
                return items.sort((a: any, b: any) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ).slice(0, limit);
            }

            const conditions = [eq(notifications.userId, ctx.user.id)];
            if (unreadOnly) {
                conditions.push(eq(notifications.isRead, 0));
            }

            return await db.select()
                .from(notifications)
                .where(and(...conditions))
                .orderBy(desc(notifications.createdAt))
                .limit(limit);
        }),

    // List notifications SENT by current user
    listSent: protectedProcedure
        .input(z.object({
            limit: z.number().default(50)
        }).optional())
        .query(async ({ ctx, input }) => {
            const db = await getDb();
            const limit = input?.limit || 50;

            if (!db) {
                return demo.list("notifications")
                    .filter((n: any) => n.fromUserId === ctx.user.id)
                    .sort((a: any, b: any) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    ).slice(0, limit);
            }

            // Get notifications sent by this user, join with users to get recipient name
            const { users } = await import("../../drizzle/schema");
            const sent = await db.select({
                id: notifications.id,
                userId: notifications.userId,
                type: notifications.type,
                title: notifications.title,
                message: notifications.message,
                link: notifications.link,
                isRead: notifications.isRead,
                createdAt: notifications.createdAt,
                recipientName: users.name,
                recipientEmail: users.email
            })
                .from(notifications)
                .leftJoin(users, eq(notifications.userId, users.id))
                .where(eq(notifications.fromUserId, ctx.user.id))
                .orderBy(desc(notifications.createdAt))
                .limit(limit);

            return sent;
        }),

    // Get unread count for current user
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();

        if (!db) {
            const items = demo.list("notifications")
                .filter((n: any) => n.userId === ctx.user.id && !n.isRead);
            return { count: items.length };
        }

        const result = await db.select({ count: sql<number>`count(*)` })
            .from(notifications)
            .where(and(
                eq(notifications.userId, ctx.user.id),
                eq(notifications.isRead, 0)
            ));

        return { count: result[0]?.count || 0 };
    }),

    // Mark single notification as read
    markRead: protectedProcedure
        .input(z.object({ notificationId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();

            if (!db) {
                const items = demo.list("notifications");
                const idx = items.findIndex((n: any) =>
                    n.id === input.notificationId && n.userId === ctx.user.id
                );
                if (idx >= 0) {
                    items[idx].isRead = 1;
                    demo.write("notifications", items);
                }
                return { success: true };
            }

            await db.update(notifications)
                .set({ isRead: 1 })
                .where(and(
                    eq(notifications.id, input.notificationId),
                    eq(notifications.userId, ctx.user.id)
                ));

            return { success: true };
        }),

    // Mark all notifications as read
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
        const db = await getDb();

        if (!db) {
            const items = demo.list("notifications");
            items.forEach((n: any) => {
                if (n.userId === ctx.user.id) n.isRead = 1;
            });
            demo.write("notifications", items);
            return { success: true };
        }

        await db.update(notifications)
            .set({ isRead: 1 })
            .where(eq(notifications.userId, ctx.user.id));

        return { success: true };
    }),

    // Send notification (admin only)
    send: protectedProcedure
        .input(z.object({
            userId: z.number(),
            title: z.string(),
            message: z.string().optional(),
            type: z.enum(['info', 'warning', 'success', 'action']).default('info'),
            link: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            // Only admin and hr_manager can send notifications
            if (!['admin', 'hr_manager'].includes(ctx.user.role)) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'لا تملك صلاحية إرسال الإشعارات' });
            }

            await createNotification({
                userId: input.userId,
                fromUserId: ctx.user.id,
                type: input.type,
                title: input.title,
                message: input.message,
                link: input.link
            });

            return { success: true };
        }),

    // Delete a notification
    delete: protectedProcedure
        .input(z.object({ notificationId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();

            if (!db) {
                demo.remove("notifications", input.notificationId);
                return { success: true };
            }

            await db.delete(notifications)
                .where(and(
                    eq(notifications.id, input.notificationId),
                    eq(notifications.userId, ctx.user.id)
                ));

            return { success: true };
        }),

    // Any user can message admin (creates notification for all admins)
    messageAdmin: protectedProcedure
        .input(z.object({
            title: z.string().min(1, 'العنوان مطلوب'),
            message: z.string().min(1, 'المحتوى مطلوب')
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) {
                // Demo mode - just simulate success
                return { success: true };
            }

            // Get all admin users
            const { users } = await import("../../drizzle/schema");
            const admins = await db.select({ id: users.id })
                .from(users)
                .where(sql`role IN ('admin', 'hr_manager')`);

            // Create notification for each admin
            for (const admin of admins) {
                await createNotification({
                    userId: admin.id,
                    fromUserId: ctx.user.id,
                    type: 'action',
                    title: `💬 رسالة من ${ctx.user.name || 'موظف'}`,
                    message: `${input.title}: ${input.message}`,
                    link: '/notifications'
                });
            }

            return { success: true };
        }),
});
