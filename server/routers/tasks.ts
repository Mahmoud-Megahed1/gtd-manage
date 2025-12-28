import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import * as demo from "../_core/demoStore";
import { and, eq, gte, lte } from "drizzle-orm";
import { projectTasks, taskComments } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import { logAudit } from "../_core/audit";

async function ensureTasksPerm(ctx: any) {
  const role = ctx.user.role;
  // Allow multiple roles to manage tasks
  const allowedRoles = [
    'admin', 'project_manager', 'designer',
    'site_engineer', 'planning_engineer',
    'architect', 'interior_designer', 'hr_manager'
  ];
  if (!allowedRoles.includes(role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'لا تملك صلاحية إدارة المهام' });
  }
}

export const tasksRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      await ensureTasksPerm(ctx);
      const conn = await db.getDb();
      if (!conn) {
        // Demo mode fallback
        const tasks = demo.list("projectTasks") as any[];
        const task = tasks.find((t: any) => t.id === input.id);
        if (!task) throw new TRPCError({ code: 'NOT_FOUND' });
        const children = tasks.filter((t: any) => t.parentId === input.id);
        const comments = (demo.list("taskComments") as any[]).filter((c: any) => c.taskId === input.id);
        return { task, children, comments };
      }
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
      status: z.enum(["planned", "in_progress", "done", "cancelled"]).optional(),
      assignedTo: z.number().optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      const role = ctx.user.role;
      const designerRoles = ['designer', 'architect', 'site_engineer', 'interior_designer', 'planning_engineer'];
      const isDesigner = designerRoles.includes(role);
      const isAdminOrManager = ['admin', 'project_manager', 'department_manager'].includes(role);

      const conn = await db.getDb();
      if (!conn) {
        // Demo mode fallback
        let tasks = demo.list("projectTasks") as any[];
        if (input?.projectId) tasks = tasks.filter((t: any) => t.projectId === input.projectId);
        if (input?.status) tasks = tasks.filter((t: any) => t.status === input.status);

        // For designers: show tasks assigned to them OR unassigned tasks
        if (isDesigner && !isAdminOrManager) {
          tasks = tasks.filter((t: any) =>
            t.assignedTo === ctx.user.id || t.assignedTo === null || t.assignedTo === undefined
          );
        }
        return tasks;
      }

      const whereClauses: any[] = [];
      if (input?.projectId) whereClauses.push(eq(projectTasks.projectId, input.projectId));
      if (input?.from) whereClauses.push(gte(projectTasks.createdAt, input.from));
      if (input?.to) whereClauses.push(lte(projectTasks.createdAt, input.to));
      if (input?.status) whereClauses.push(eq(projectTasks.status, input.status));

      // For designers: show tasks assigned to them OR unassigned tasks
      // Admins/managers see all tasks regardless of assignment
      if (isDesigner && !isAdminOrManager) {
        const { or, isNull } = await import("drizzle-orm");
        whereClauses.push(
          or(
            eq(projectTasks.assignedTo, ctx.user.id),
            isNull(projectTasks.assignedTo)
          )
        );
      }

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
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      estimateHours: z.number().min(0).optional(),
      progress: z.number().min(0).max(100).optional(),
      parentId: z.number().optional(),
      status: z.enum(["planned", "in_progress", "done", "cancelled"]).default("planned")
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTasksPerm(ctx);

      // Only admin and project_manager can CREATE tasks
      const canCreate = ['admin', 'project_manager'].includes(ctx.user.role);
      if (!canCreate) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'لا يمكنك إنشاء مهام - صلاحية المشاهدة فقط' });
      }

      const conn = await db.getDb();
      if (!conn) {
        // Demo mode fallback
        const rec = demo.insert("projectTasks", {
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
        });
        return { success: true, id: rec.id };
      }
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
      await logAudit(ctx.user.id, 'CREATE_TASK', 'task', undefined, `Task: ${input.name}`, ctx);

      // Notify assigned user about new task
      if (input.assignedTo) {
        const { createNotification } = await import('./notifications');
        await createNotification({
          userId: input.assignedTo,
          fromUserId: ctx.user.id,
          type: 'action',
          title: '📋 مهمة جديدة',
          message: `تم إسناد مهمة جديدة لك: ${input.name}`,
          entityType: 'task',
          link: '/tasks'
        });
      }

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
      status: z.enum(["planned", "in_progress", "done", "cancelled"]).optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      estimateHours: z.number().min(0).optional(),
      progress: z.number().min(0).max(100).optional(),
      parentId: z.number().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTasksPerm(ctx);
      const conn = await db.getDb();
      if (!conn) {
        // Demo mode fallback
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
        demo.update("projectTasks", input.id, updates);
        return { success: true };
      }
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
        const { createNotification, createNotificationForRoles } = await import('./notifications');
        const statusLabels: Record<string, string> = {
          'planned': 'مخطط',
          'in_progress': 'قيد التنفيذ',
          'done': 'مكتمل',
          'cancelled': 'ملغي'
        };

        // Status change notification → notify project managers
        if (input.status && input.status !== prev.status) {
          await notifyOwner({ title: "تغيير حالة مهمة", content: `تم تغيير حالة المهمة "${prev.name}" إلى ${input.status}` }).catch(() => { });

          // Also send in-app notification to project managers
          await createNotificationForRoles({
            roles: ['admin', 'project_manager'],
            fromUserId: ctx.user.id,
            type: 'info',
            title: `تحديث حالة مهمة: ${statusLabels[input.status] || input.status}`,
            message: `المهمة "${prev.name}" تم تغيير حالتها من ${statusLabels[prev.status] || prev.status} إلى ${statusLabels[input.status] || input.status}`,
            entityType: 'task',
            entityId: input.id,
            link: '/tasks'
          });
        }

        // Assignment change notification → notify new assignee
        if (input.assignedTo !== undefined && input.assignedTo !== prev.assignedTo) {
          await notifyOwner({ title: "تعيين مسؤول مهمة", content: `تم تعيين/تغيير مسؤول المهمة "${prev.name}"` }).catch(() => { });

          // Notify new assignee
          if (input.assignedTo) {
            await createNotification({
              userId: input.assignedTo,
              fromUserId: ctx.user.id,
              type: 'action',
              title: '📋 تم إسنادك لمهمة',
              message: `تم إسناد المهمة "${prev.name}" لك`,
              entityType: 'task',
              entityId: input.id,
              link: '/tasks'
            });
          }
        }
      }
      await logAudit(ctx.user.id, 'UPDATE_TASK', 'task', input.id, `Updated task`, ctx);
      return { success: true };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ensureTasksPerm(ctx);

      // Only admin and project_manager can DELETE tasks
      const canDelete = ['admin', 'project_manager'].includes(ctx.user.role);
      if (!canDelete) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'لا يمكنك حذف مهام - صلاحية المشاهدة فقط' });
      }

      const conn = await db.getDb();
      if (!conn) {
        // Demo mode fallback
        demo.remove("projectTasks", input.id);
        return { success: true };
      }
      await conn.delete(projectTasks).where(eq(projectTasks.id, input.id));
      await logAudit(ctx.user.id, 'DELETE_TASK', 'task', input.id, `Deleted task`, ctx);
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
        await logAudit(ctx.user.id, 'ADD_TASK_COMMENT', 'task', input.taskId, `Comment added`, ctx);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensureTasksPerm(ctx);
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await conn.delete(taskComments).where(eq(taskComments.id, input.id));
        await logAudit(ctx.user.id, 'DELETE_TASK_COMMENT', 'task', input.id, `Comment deleted`, ctx);
        return { success: true };
      })
  })
});
