import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { and, eq, gte, lte } from "drizzle-orm";
import { projectTasks, taskComments } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";

async function ensureTasksPerm(ctx: any) {
  const role = ctx.user.role;
  if (!['admin', 'project_manager', 'designer'].includes(role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
}

export const tasksRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      await ensureTasksPerm(ctx);
      const conn = await db.getDb();
      if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const rows = await conn.select().from(projectTasks).where(eq(projectTasks.id, input.id)).limit(1);
      const task = rows[0];
      if (!task) throw new TRPCError({ code: 'NOT_FOUND' });
      const children = await conn.select().from(projectTasks).where(eq(projectTasks.parentId, input.id));
      const comments = await conn.select().from(taskComments).where(eq(taskComments.taskId, input.id));
      return { task, children, comments };
    }),
  list: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      from: z.date().optional(),
      to: z.date().optional(),
      status: z.enum(["planned","in_progress","done","cancelled"]).optional(),
      assignedTo: z.number().optional()
    }).optional())
    .query(async ({ input }) => {
      const conn = await db.getDb();
      if (!conn) {
        return [];
      }
      const whereClauses: any[] = [];
      if (input?.projectId) whereClauses.push(eq(projectTasks.projectId, input.projectId));
      if (input?.from) whereClauses.push(gte(projectTasks.createdAt, input.from));
      if (input?.to) whereClauses.push(lte(projectTasks.createdAt, input.to));
      if (input?.status) whereClauses.push(eq(projectTasks.status, input.status));
      if (input?.assignedTo) whereClauses.push(eq(projectTasks.assignedTo, input.assignedTo));
      const where = whereClauses.length ? and(...whereClauses) : undefined as any;
      const rows = where ? await conn.select().from(projectTasks).where(where) : await conn.select().from(projectTasks);
      return rows;
    }),
  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      assignedTo: z.number().optional(),
      priority: z.enum(["low","medium","high","critical"]).optional(),
      estimateHours: z.number().min(0).optional(),
      progress: z.number().min(0).max(100).optional(),
      parentId: z.number().optional(),
      status: z.enum(["planned","in_progress","done","cancelled"]).default("planned")
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTasksPerm(ctx);
      const conn = await db.getDb();
      if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await conn.insert(projectTasks).values({
        projectId: input.projectId,
        name: input.name,
        description: input.description ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        assignedTo: input.assignedTo ?? null,
        status: input.status,
        priority: input.priority ?? "medium",
        estimateHours: input.estimateHours ?? null,
        progress: input.progress ?? 0,
        parentId: input.parentId ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'CREATE_TASK', entityType: 'task', details: `Task: ${input.name}` } as any);
      return { success: true };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      assignedTo: z.number().optional(),
      status: z.enum(["planned","in_progress","done","cancelled"]).optional(),
      priority: z.enum(["low","medium","high","critical"]).optional(),
      estimateHours: z.number().min(0).optional(),
      progress: z.number().min(0).max(100).optional(),
      parentId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTasksPerm(ctx);
      const conn = await db.getDb();
      if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const updates: any = { updatedAt: new Date() };
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.startDate !== undefined) updates.startDate = input.startDate;
      if (input.endDate !== undefined) updates.endDate = input.endDate;
      if (input.assignedTo !== undefined) updates.assignedTo = input.assignedTo;
      if (input.status !== undefined) updates.status = input.status;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.estimateHours !== undefined) updates.estimateHours = input.estimateHours;
      if (input.progress !== undefined) updates.progress = input.progress;
      if (input.parentId !== undefined) updates.parentId = input.parentId;
      // Fetch current task to detect changes for notifications
      const current = await conn.select().from(projectTasks).where(eq(projectTasks.id, input.id)).limit(1);
      await conn.update(projectTasks).set(updates).where(eq(projectTasks.id, input.id));
      // Notifications
      const prev = current[0] as any;
      if (prev) {
        if (input.status && input.status !== prev.status) {
          await notifyOwner({ title: "تغيير حالة مهمة", content: `تم تغيير حالة المهمة "${prev.name}" إلى ${input.status}` }).catch(() => {});
        }
        if (input.assignedTo !== undefined && input.assignedTo !== prev.assignedTo) {
          await notifyOwner({ title: "تعيين مسؤول مهمة", content: `تم تعيين/تغيير مسؤول المهمة "${prev.name}"` }).catch(() => {});
        }
      }
      await db.createAuditLog({ userId: ctx.user.id, action: 'UPDATE_TASK', entityType: 'task', entityId: input.id, details: `Updated task` } as any);
      return { success: true };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ensureTasksPerm(ctx);
      const conn = await db.getDb();
      if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await conn.delete(projectTasks).where(eq(projectTasks.id, input.id));
      await db.createAuditLog({ userId: ctx.user.id, action: 'DELETE_TASK', entityType: 'task', entityId: input.id, details: `Deleted task` } as any);
      return { success: true };
    }),
  comments: router({
    list: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensureTasksPerm(ctx);
        const conn = await db.getDb();
        if (!conn) return [];
        return await conn.select().from(taskComments).where(eq(taskComments.taskId, input.taskId));
      }),
    add: protectedProcedure
      .input(z.object({ taskId: z.number(), content: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        await ensureTasksPerm(ctx);
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await conn.insert(taskComments).values({
          taskId: input.taskId,
          content: input.content,
          createdBy: ctx.user.id,
          createdAt: new Date()
        } as any);
        await db.createAuditLog({ userId: ctx.user.id, action: 'ADD_TASK_COMMENT', entityType: 'task', entityId: input.taskId, details: `Comment added` } as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensureTasksPerm(ctx);
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await conn.delete(taskComments).where(eq(taskComments.id, input.id));
        await db.createAuditLog({ userId: ctx.user.id, action: 'DELETE_TASK_COMMENT', entityType: 'task', entityId: input.id, details: `Comment deleted` } as any);
        return { success: true };
      })
  })
});
