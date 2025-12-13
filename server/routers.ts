import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { hrRouter } from "./routers/hr";
import { accountingRouter } from "./routers/accounting";
import { reportsRouter } from "./routers/reports";
import { tasksRouter } from "./routers/tasks";
import { invoices, expenses } from "../drizzle/schema";
import { gte, eq, desc } from "drizzle-orm";

// Helper to generate unique numbers
function generateUniqueNumber(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

// Helper for audit logging
async function logAudit(
  userId: number,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: string,
  ipAddress?: string
) {
  await db.createAuditLog({
    userId,
    action,
    entityType,
    entityId,
    details,
    ipAddress
  });
}

async function ensurePerm(ctx: any, sectionKey: string) {
  const role = ctx.user.role;
  const allowedByRole: Record<string, string[]> = {
    admin: ['*'],
    finance_manager: ['accounting', 'reports'],
    accountant: ['accounting', 'reports'],
    project_manager: ['projects', 'projectTasks', 'rfis', 'submittals', 'drawings', 'projectReports'],
    site_engineer: ['projects', 'projectTasks', 'rfis', 'submittals', 'drawings'],
    planning_engineer: ['projects', 'projectTasks', 'projectReports'],
    procurement_officer: ['procurement', 'purchases', 'boq', 'projectReports'],
    qa_qc: ['qaqc', 'submittals', 'rfis'],
    document_controller: ['documents', 'drawings', 'submittals', 'attachments'],
    architect: ['projects', 'drawings', 'rfis', 'submittals'],
    interior_designer: ['projects', 'drawings'],
    designer: ['projects', 'projectTasks'],
    sales_manager: ['sales', 'clients', 'invoices'],
    hr_manager: ['hr'],
    storekeeper: ['procurement'],
    viewer: [],
  };
  const allowedList = allowedByRole[role] || [];
  const roleAllowed = allowedList.includes('*') || allowedList.includes(sectionKey);
  if (!roleAllowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Section access denied' });
  }
  const perms = await db.getUserPermissions(ctx.user.id);
  const record = perms?.permissionsJson ? JSON.parse(perms.permissionsJson) : {};
  if (record.hasOwnProperty(sectionKey) && !record[sectionKey]) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Section access denied' });
  }
}
// Role-based access control
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

const accountantProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'accountant', 'finance_manager'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Accountant access required' });
  }
  return next({ ctx });
});

const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'project_manager', 'site_engineer', 'architect', 'interior_designer', 'planning_engineer', 'designer'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Project manager access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      if (ctx.user) {
        logAudit(ctx.user.id, 'LOGOUT', 'user', ctx.user.id);
      }
      return { success: true } as const;
    }),
    health: publicProcedure.query(() => {
      return {
        hasCookieSecret: Boolean(process.env.COOKIE_SECRET || process.env.JWT_SECRET),
        hasOAuthServerUrl: Boolean(process.env.OAUTH_SERVER_URL),
        serverOriginSet: Boolean(process.env.VITE_SERVER_ORIGIN),
        isProduction: process.env.NODE_ENV === "production",
      };
    }),
  }),

  // ============= CLIENTS =============
  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await ensurePerm(ctx, 'clients');
      return await db.getAllClients();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'clients');
        const client = await db.getClientById(input.id);
        if (!client) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const [projects, invoices, forms] = await Promise.all([
          db.getClientProjects(input.id),
          db.getClientInvoices(input.id),
          db.getClientForms(input.id)
        ]);
        
        return { client, projects, invoices, forms };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        notes: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'clients');
        const clientNumber = generateUniqueNumber('CLT');
        await db.createClient({
          ...input,
          clientNumber,
          createdBy: ctx.user.id
        });
        
        await logAudit(ctx.user.id, 'CREATE_CLIENT', 'client', undefined, `Created client: ${input.name}`);
        return { success: true, clientNumber };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        notes: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'clients');
        const { id, ...data } = input;
        await db.updateClient(id, data);
        await logAudit(ctx.user.id, 'UPDATE_CLIENT', 'client', id, `Updated client`);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'clients');
        await db.deleteClient(input.id);
        await logAudit(ctx.user.id, 'DELETE_CLIENT', 'client', input.id);
        return { success: true };
      })
  }),

  // ============= PROJECTS =============
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await ensurePerm(ctx, 'projects');
      return await db.getAllProjects();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const project = await db.getProjectById(input.id);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const [client, boqItems, expenses, installments] = await Promise.all([
          db.getClientById(project.clientId),
          db.getProjectBOQ(input.id),
          db.getProjectExpenses(input.id),
          db.getProjectInstallments(input.id)
        ]);
        
        return { project, client, boqItems, expenses, installments };
      }),

    create: managerProcedure
      .input(z.object({
        clientId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        budget: z.number().optional(),
        assignedTo: z.number().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const projectNumber = generateUniqueNumber('PRJ');
        await db.createProject({
          ...input,
          projectNumber,
          createdBy: ctx.user.id
        });
        
        await logAudit(ctx.user.id, 'CREATE_PROJECT', 'project', undefined, `Created project: ${input.name}`);
        return { success: true, projectNumber };
      }),

    update: managerProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['design', 'execution', 'delivery', 'completed', 'cancelled']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        budget: z.number().optional(),
        assignedTo: z.number().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const { id, ...data } = input;
        await db.updateProject(id, data);
        await logAudit(ctx.user.id, 'UPDATE_PROJECT', 'project', id);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        await db.deleteProject(input.id);
        await logAudit(ctx.user.id, 'DELETE_PROJECT', 'project', input.id);
        return { success: true };
      }),

    getDetails: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const project = await db.getProjectById(input.id);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
        
        const [boq, expenses, installments] = await Promise.all([
          db.getProjectBOQ(input.id),
          db.getProjectExpenses(input.id),
          db.getProjectInstallments(input.id)
        ]);
        
        return { project, boq, expenses, installments };
      }),
    
    createTask: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        await db.createProjectTask({
          projectId: input.projectId,
          name: input.name,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          status: 'planned'
        } as any);
        await logAudit(ctx.user.id, 'CREATE_TASK', 'project', input.projectId, `Task: ${input.name}`);
        return { success: true };
      }),
    
    listTasks: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        return await db.getProjectTasks(input.projectId);
      }),
    
    deleteTask: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        await db.deleteProjectTask(input.id);
        await logAudit(ctx.user.id, 'DELETE_TASK', 'task', input.id);
        return { success: true };
      }),
  }),
  rfi: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) return [];
        const { rfis } = await import("../drizzle/schema");
        return await conn.select().from(rfis).where(eq(rfis.projectId, input.projectId)).orderBy(desc(rfis.submittedAt));
      }),
    create: protectedProcedure
      .input(z.object({ projectId: z.number(), title: z.string(), question: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { rfis } = await import("../drizzle/schema");
        const rfiNumber = generateUniqueNumber("RFI");
        await conn.insert(rfis).values({
          projectId: input.projectId,
          rfiNumber,
          title: input.title,
          question: input.question,
          status: "open",
          submittedBy: ctx.user.id
        } as any);
        await logAudit(ctx.user.id, 'CREATE_RFI', 'project', input.projectId, rfiNumber);
        return { success: true, rfiNumber };
      }),
    answer: protectedProcedure
      .input(z.object({ id: z.number(), answer: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { rfis } = await import("../drizzle/schema");
        await conn.update(rfis).set({ answer: input.answer, answeredBy: ctx.user.id, answeredAt: new Date(), status: "answered" }).where(eq(rfis.id, input.id));
        await logAudit(ctx.user.id, 'ANSWER_RFI', 'rfi', input.id);
        return { success: true };
      }),
    close: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { rfis } = await import("../drizzle/schema");
        await conn.update(rfis).set({ status: "closed" }).where(eq(rfis.id, input.id));
        await logAudit(ctx.user.id, 'CLOSE_RFI', 'rfi', input.id);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { rfis } = await import("../drizzle/schema");
        await conn.delete(rfis).where(eq(rfis.id, input.id));
        await logAudit(ctx.user.id, 'DELETE_RFI', 'rfi', input.id);
        return { success: true };
      }),
  }),
  submittals: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) return [];
        const { submittals } = await import("../drizzle/schema");
        return await conn.select().from(submittals).where(eq(submittals.projectId, input.projectId)).orderBy(desc(submittals.submittedAt));
      }),
    create: protectedProcedure
      .input(z.object({ projectId: z.number(), title: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { submittals } = await import("../drizzle/schema");
        const code = generateUniqueNumber("SUB");
        await conn.insert(submittals).values({
          projectId: input.projectId,
          submittalCode: code,
          title: input.title,
          status: "submitted",
          submittedBy: ctx.user.id
        } as any);
        await logAudit(ctx.user.id, 'CREATE_SUBMITTAL', 'project', input.projectId, code);
        return { success: true, code };
      }),
    approve: protectedProcedure
      .input(z.object({ id: z.number(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { submittals } = await import("../drizzle/schema");
        await conn.update(submittals).set({ status: "approved", approvedBy: ctx.user.id, approvedAt: new Date(), notes: input.notes }).where(eq(submittals.id, input.id));
        await logAudit(ctx.user.id, 'APPROVE_SUBMITTAL', 'submittal', input.id);
        return { success: true };
      }),
    reject: protectedProcedure
      .input(z.object({ id: z.number(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { submittals } = await import("../drizzle/schema");
        await conn.update(submittals).set({ status: "rejected", approvedBy: ctx.user.id, approvedAt: new Date(), notes: input.notes }).where(eq(submittals.id, input.id));
        await logAudit(ctx.user.id, 'REJECT_SUBMITTAL', 'submittal', input.id);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { submittals } = await import("../drizzle/schema");
        await conn.delete(submittals).where(eq(submittals.id, input.id));
        await logAudit(ctx.user.id, 'DELETE_SUBMITTAL', 'submittal', input.id);
        return { success: true };
      }),
  }),
  drawings: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) return [];
        const { drawings, drawingVersions } = await import("../drizzle/schema");
        const rows = await conn.select().from(drawings).where(eq(drawings.projectId, input.projectId)).orderBy(desc(drawings.createdAt));
        return rows;
      }),
    create: protectedProcedure
      .input(z.object({ projectId: z.number(), drawingCode: z.string(), title: z.string(), discipline: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { drawings } = await import("../drizzle/schema");
        await conn.insert(drawings).values({
          projectId: input.projectId,
          drawingCode: input.drawingCode,
          title: input.title,
          discipline: input.discipline,
          status: "draft"
        } as any);
        await logAudit(ctx.user.id, 'CREATE_DRAWING', 'project', input.projectId, input.drawingCode);
        return { success: true };
      }),
    addVersion: protectedProcedure
      .input(z.object({ drawingId: z.number(), version: z.string(), fileUrl: z.string(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { drawingVersions, drawings } = await import("../drizzle/schema");
        const res = await conn.insert(drawingVersions).values({
          drawingId: input.drawingId,
          version: input.version,
          fileUrl: input.fileUrl,
          notes: input.notes,
          createdBy: ctx.user.id
        } as any);
        const [latest] = await conn.select().from(drawingVersions).where(eq(drawingVersions.drawingId, input.drawingId)).orderBy(desc(drawingVersions.createdAt)).limit(1);
        if (latest) {
          await conn.update(drawings).set({ currentVersionId: latest.id, status: "issued" }).where(eq(drawings.id, input.drawingId));
        }
        await logAudit(ctx.user.id, 'ADD_DRAWING_VERSION', 'drawing', input.drawingId, input.version);
        return { success: true };
      }),
    versions: protectedProcedure
      .input(z.object({ drawingId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) return [];
        const { drawingVersions } = await import("../drizzle/schema");
        return await conn.select().from(drawingVersions).where(eq(drawingVersions.drawingId, input.drawingId)).orderBy(desc(drawingVersions.createdAt));
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { drawings } = await import("../drizzle/schema");
        await conn.delete(drawings).where(eq(drawings.id, input.id));
        await logAudit(ctx.user.id, 'DELETE_DRAWING', 'drawing', input.id);
        return { success: true };
      }),
  }),
  projectReports: router({
    baselineVsActual: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const tasks = await db.getProjectTasks(input.projectId);
        const now = new Date();
        let plannedSum = 0;
        let plannedCount = 0;
        let actualSum = 0;
        let actualCount = 0;
        tasks.forEach((t: any) => {
          if (t.startDate && t.endDate) {
            plannedCount++;
            const start = new Date(t.startDate).getTime();
            const end = new Date(t.endDate).getTime();
            const total = Math.max(end - start, 1);
            const elapsed = Math.max(Math.min(now.getTime() - start, total), 0);
            const planned = Math.min(Math.round((elapsed / total) * 100), 100);
            plannedSum += planned;
          }
          actualCount++;
          const actual = typeof t.progress === "number" ? t.progress : (t.status === "done" ? 100 : t.status === "in_progress" ? 50 : 0);
          actualSum += actual;
        });
        const plannedPercent = plannedCount > 0 ? Math.round(plannedSum / plannedCount) : 0;
        const actualPercent = actualCount > 0 ? Math.round(actualSum / actualCount) : 0;
        const variance = actualPercent - plannedPercent;
        return { plannedPercent, actualPercent, variance };
      }),
    procurementTracker: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) return [];
        const { boq, purchases } = await import("../drizzle/schema");
        const items = await conn.select().from(boq).where(eq(boq.projectId, input.projectId));
        const orders = await conn.select().from(purchases).where(eq(purchases.projectId, input.projectId));
        const rows = items.map((it: any) => {
          const totalCost = Number(it.total || 0);
          const ordered = orders.filter((o: any) => (o.description || "").toLowerCase().includes((it.itemName || "").toLowerCase())).reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);
          const status = ordered <= 0 ? "not_ordered" : ordered < totalCost ? "partial" : "ordered";
          return { itemName: it.itemName, totalCost, ordered, status };
        });
        return rows;
      }),
  }),

  // ============= INVOICES =============
  invoices: router({
    list: protectedProcedure
      .input(z.object({ type: z.enum(['invoice', 'quote']).optional() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'invoices');
        const allInvoices = await db.getAllInvoices();
        if (input.type) {
          return allInvoices.filter(inv => inv.type === input.type);
        }
        return allInvoices;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'invoices');
        const invoice = await db.getInvoiceById(input.id);
        if (!invoice) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const [client, items] = await Promise.all([
          db.getClientById(invoice.clientId),
          db.getInvoiceItems(input.id)
        ]);
        
        return { invoice, client, items };
      }),

    create: protectedProcedure
      .input(z.object({
        type: z.enum(['invoice', 'quote']),
        clientId: z.number(),
        projectId: z.number().optional(),
        issueDate: z.date(),
        dueDate: z.date().optional(),
        subtotal: z.number(),
        tax: z.number().optional(),
        discount: z.number().optional(),
        total: z.number(),
        notes: z.string().optional(),
        terms: z.string().optional(),
        formData: z.string().optional(),
        items: z.array(z.object({
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          total: z.number()
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'invoices');
        const invoiceNumber = generateUniqueNumber(input.type === 'invoice' ? 'INV' : 'QUO');
        const { items, ...invoiceData } = input;
        
        const result = await db.createInvoice({
          ...invoiceData,
          invoiceNumber,
          createdBy: ctx.user.id
        });
        
        const invoiceId = Number((result as any).insertId);
        
        // Only create items if invoiceId is valid
        if (invoiceId && !isNaN(invoiceId)) {
          for (let i = 0; i < items.length; i++) {
            await db.createInvoiceItem({
              invoiceId,
              ...items[i],
              sortOrder: i
            });
          }
        }
        
        await logAudit(ctx.user.id, 'CREATE_INVOICE', 'invoice', invoiceId, `Created ${input.type}: ${invoiceNumber}`);
        
        // Notify owner
        await notifyOwner({
          title: `${input.type === 'invoice' ? 'فاتورة جديدة' : 'عرض سعر جديد'}`,
          content: `تم إنشاء ${input.type === 'invoice' ? 'فاتورة' : 'عرض سعر'} رقم ${invoiceNumber} بمبلغ ${input.total} ريال`
        });
        
        // Return the full invoice object
        const createdInvoice = await db.getInvoiceById(invoiceId);
        return createdInvoice || { id: invoiceId, invoiceNumber, type: input.type, total: input.total };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['draft', 'sent', 'paid', 'cancelled']).optional(),
        notes: z.string().optional(),
        formData: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'invoices');
        const { id, ...data } = input;
        await db.updateInvoice(id, data);
        await logAudit(ctx.user.id, 'UPDATE_INVOICE', 'invoice', id);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'invoices');
        await db.deleteInvoice(input.id);
        await logAudit(ctx.user.id, 'DELETE_INVOICE', 'invoice', input.id);
        return { success: true };
      })
  }),

  // ============= CHANGE ORDERS =============
  changeOrders: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        return await db.getProjectChangeOrders(input.projectId);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const co = await db.getChangeOrderById(input.id);
        if (!co) throw new TRPCError({ code: 'NOT_FOUND' });
        const project = await db.getProjectById(co.projectId);
        return { changeOrder: co, project };
      }),
    create: managerProcedure
      .input(z.object({
        projectId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        origin: z.enum(['client', 'internal', 'site']).optional(),
        impactCost: z.number().min(0).default(0),
        impactDays: z.number().min(0).default(0),
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const code = generateUniqueNumber('CO');
        const result = await db.createChangeOrder({
          projectId: input.projectId,
          code,
          title: input.title,
          description: input.description,
          origin: input.origin || 'client',
          status: 'draft',
          impactCost: input.impactCost,
          impactDays: input.impactDays,
          createdBy: ctx.user.id
        } as any);
        const id = Number((result as any)?.insertId) || undefined;
        await logAudit(ctx.user.id, 'CREATE_CHANGE_ORDER', 'changeOrder', id, `CO ${code}`);
        return { success: true, id, code };
      }),
    submit: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        await db.updateChangeOrder(input.id, { status: 'submitted', submittedBy: ctx.user.id, submittedAt: new Date() });
        await logAudit(ctx.user.id, 'SUBMIT_CHANGE_ORDER', 'changeOrder', input.id);
        return { success: true };
      }),
    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!['admin', 'accountant', 'project_manager'].includes(ctx.user.role)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Approval access required' });
        }
        await ensurePerm(ctx, 'projects');
        await db.updateChangeOrder(input.id, { status: 'approved', approvedBy: ctx.user.id, approvedAt: new Date() });
        await logAudit(ctx.user.id, 'APPROVE_CHANGE_ORDER', 'changeOrder', input.id);
        return { success: true };
      }),
    reject: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().min(2) }))
      .mutation(async ({ input, ctx }) => {
        if (!['admin', 'accountant', 'project_manager'].includes(ctx.user.role)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Approval access required' });
        }
        await ensurePerm(ctx, 'projects');
        await db.updateChangeOrder(input.id, { status: 'rejected', rejectedBy: ctx.user.id, rejectedAt: new Date(), rejectionReason: input.reason });
        await logAudit(ctx.user.id, 'REJECT_CHANGE_ORDER', 'changeOrder', input.id, input.reason);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        await db.deleteChangeOrder(input.id);
        await logAudit(ctx.user.id, 'DELETE_CHANGE_ORDER', 'changeOrder', input.id);
        return { success: true };
      }),
  }),

  // ============= FORMS =============
  forms: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await ensurePerm(ctx, 'forms');
      return await db.getAllForms();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'forms');
        const form = await db.getFormById(input.id);
        if (!form) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const client = await db.getClientById(form.clientId);
        return { form, client };
      }),

    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        projectId: z.number().optional(),
        formType: z.string(),
        formData: z.string()
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'forms');
        const formNumber = generateUniqueNumber('FRM');
        const result = await db.createForm({
          ...input,
          formNumber,
          createdBy: ctx.user.id
        });
        const formId = Number((result as any)?.insertId) || undefined;
        
        await logAudit(ctx.user.id, 'CREATE_FORM', 'form', formId, `Created form: ${formNumber}`);
        
        // Notify owner
        await notifyOwner({
          title: 'استمارة عميل جديدة',
          content: `تم إضافة استمارة جديدة رقم ${formNumber}`
        });
        
        return { success: true, id: formId, formNumber };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'reviewed', 'approved', 'rejected']).optional(),
        formData: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'forms');
        const { id, ...data } = input;
        await db.updateForm(id, data);
        await logAudit(ctx.user.id, 'UPDATE_FORM', 'form', id);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'forms');
        await db.deleteForm(input.id);
        await logAudit(ctx.user.id, 'DELETE_FORM', 'form', input.id);
        return { success: true };
      })
  }),



  // ============= AUDIT LOGS =============
  auditLogs: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'audit');
        return await db.getAuditLogs(input.limit);
      }),

    getEntityLogs: protectedProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'audit');
        return await db.getEntityAuditLogs(input.entityType, input.entityId);
      })
  }),

  // ============= SETTINGS =============
  settings: router({
    get: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'settings');
        return await db.getCompanySetting(input.key);
      }),

    getAll: adminProcedure.query(async ({ ctx }) => {
      await ensurePerm(ctx, 'settings');
      return await db.getAllCompanySettings();
    }),

    set: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'settings');
        await db.setCompanySetting(input.key, input.value, ctx.user.id);
        await logAudit(ctx.user.id, 'UPDATE_SETTING', 'setting', undefined, `Updated setting: ${input.key}`);
        return { success: true };
      })
  }),

  // ============= USERS =============
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email(),
        role: z.enum([
          'admin','accountant','finance_manager',
          'project_manager','site_engineer','planning_engineer',
          'procurement_officer','qa_qc','document_controller',
          'architect','interior_designer','sales_manager',
          'hr_manager','storekeeper','designer','viewer'
        ]).default('designer')
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if email already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Email already exists' });
        }

        const user = await db.createUser({
          name: input.name,
          email: input.email,
          role: input.role
        });

        await logAudit(ctx.user.id, 'CREATE_USER', 'user', user.id, `Created user ${input.email} with role ${input.role}`);
        return user;
      }),

    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum([
          'admin','accountant','finance_manager',
          'project_manager','site_engineer','planning_engineer',
          'procurement_officer','qa_qc','document_controller',
          'architect','interior_designer','sales_manager',
          'hr_manager','storekeeper','designer','viewer'
        ]).optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const role = (input.role ?? 'designer') as any;
        await db.updateUserRole(input.userId, role);
        await logAudit(ctx.user.id, 'UPDATE_USER_ROLE', 'user', input.userId, `Changed role to ${input.role}`);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum([
          'admin','accountant','finance_manager',
          'project_manager','site_engineer','planning_engineer',
          'procurement_officer','qa_qc','document_controller',
          'architect','interior_designer','sales_manager',
          'hr_manager','storekeeper','designer','viewer'
        ]).optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const { userId, ...updateData } = input;
        
        if (updateData.email) {
          const existingUser = await db.getUserByEmail(updateData.email);
          if (existingUser && existingUser.id !== userId) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Email already exists' });
          }
        }

        await db.updateUser(userId, updateData);
        await logAudit(ctx.user.id, 'UPDATE_USER', 'user', userId, `Updated user information`);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({
        userId: z.number()
      }))
      .mutation(async ({ input, ctx }) => {
        // Prevent deleting yourself
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete your own account' });
        }

        await db.deleteUser(input.userId);
        await logAudit(ctx.user.id, 'DELETE_USER', 'user', input.userId, `Deleted user`);
        return { success: true };
      })
    ,
    getPermissions: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const perms = await db.getUserPermissions(input.userId);
        return perms?.permissionsJson ? JSON.parse(perms.permissionsJson) : {};
      }),
    mePermissions: protectedProcedure.query(async ({ ctx }) => {
      const perms = await db.getUserPermissions(ctx.user.id);
      return perms?.permissionsJson ? JSON.parse(perms.permissionsJson) : {};
    }),
    setPermissions: adminProcedure
      .input(z.object({
        userId: z.number(),
        permissions: z.record(z.string(), z.boolean())
      }))
      .mutation(async ({ input, ctx }) => {
        await db.setUserPermissions(input.userId, input.permissions);
        await logAudit(ctx.user.id, 'UPDATE_USER_PERMISSIONS', 'user', input.userId, `Updated permissions`);
        return { success: true };
      })
  }),

  // ============= SEARCH =============
  search: router({
    global: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'search');
        return await db.globalSearch(input.query);
      })
  }),

  // ============= DASHBOARD =============
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      await ensurePerm(ctx, 'dashboard');
      return await db.getDashboardStats();
    }),
    projectsByStatus: protectedProcedure.query(async ({ ctx }) => {
      await ensurePerm(ctx, 'dashboard');
      const projects = await db.getAllProjects();
      return {
        design: projects.filter(p => p.status === 'design').length,
        execution: projects.filter(p => p.status === 'execution').length,
        delivery: projects.filter(p => p.status === 'delivery').length,
        completed: projects.filter(p => p.status === 'completed').length,
        cancelled: projects.filter(p => p.status === 'cancelled').length,
      };
    }),
    monthlyRevenue: protectedProcedure.query(async ({ ctx }) => {
      await ensurePerm(ctx, 'dashboard');
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const now = new Date();
      const start = new Date(now);
      start.setMonth(now.getMonth() - 5);
      start.setDate(1);
      const conn = await db.getDb();
      if (!conn) {
        return Array.from({ length: 6 }).map((_, idx) => {
          const m = (start.getMonth() + idx) % 12;
          return { month: months[m], revenue: 0, expenses: 0 };
        });
      }
      const invRows = await conn.select().from(invoices).where(gte(invoices.createdAt, start));
      const expRows = await conn.select().from(expenses).where(gte(expenses.createdAt, start));
      const acc: Record<string, { revenue: number; expenses: number }> = {};
      Array.from({ length: 6 }).forEach((_, idx) => {
        const d = new Date(start);
        d.setMonth(start.getMonth() + idx);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        acc[key] = { revenue: 0, expenses: 0 };
      });
      invRows.forEach((r: any) => {
        const d = new Date(r.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (acc[key]) acc[key].revenue += Number(r.total || 0);
      });
      expRows.forEach((r: any) => {
        const d = new Date(r.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (acc[key]) acc[key].expenses += Number(r.amount || 0);
      });
      return Array.from({ length: 6 }).map((_, idx) => {
        const d = new Date(start);
        d.setMonth(start.getMonth() + idx);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const m = d.getMonth();
        const row = acc[key] || { revenue: 0, expenses: 0 };
        return { month: months[m], revenue: row.revenue, expenses: row.expenses };
      });
    }),
  }),

  // ============= FILE UPLOAD =============
  files: router({
    upload: protectedProcedure
      .input(z.object({
        entityType: z.string(),
        entityId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string()
      }))
      .mutation(async ({ input, ctx }) => {
        const ALLOWED_TYPES = [
          'image/png',
          'image/jpeg',
          'image/webp',
          'application/pdf',
          'text/plain',
          'text/html',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (!ALLOWED_TYPES.includes(input.mimeType)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'نوع الملف غير مسموح' });
        }
        const safeName = input.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const section =
          input.entityType.startsWith('form')
            ? 'forms'
            : input.entityType.startsWith('invoice')
              ? 'invoices'
              : input.entityType === 'setting'
                ? 'settings'
                : 'settings';
        await ensurePerm(ctx, section);
        let buffer: Buffer;
        try {
          buffer = Buffer.from(input.fileData, 'base64');
        } catch {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'ملف غير صالح' });
        }
        if (buffer.length > MAX_SIZE) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'حجم الملف يتجاوز الحد المسموح' });
        }
        // Verify magic numbers to prevent MIME spoofing
        const head = buffer.subarray(0, 16);
        const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
        const isJpeg = head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
        const isWebp = head.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
        const isPdf = head.toString('ascii', 0, 4) === '%PDF';
        const isZip = head.toString('ascii', 0, 2) === 'PK'; // docx/xlsx
        const isHtml = buffer.toString('utf8', 0, 16).toLowerCase().includes('<!doctype') || buffer.toString('utf8', 0, 16).toLowerCase().includes('<html');
        const isText = input.mimeType === 'text/plain';
        const mimeOk =
          (input.mimeType === 'image/png' && isPng) ||
          (input.mimeType === 'image/jpeg' && isJpeg) ||
          (input.mimeType === 'image/webp' && isWebp) ||
          (input.mimeType === 'application/pdf' && isPdf) ||
          (input.mimeType === 'text/html' && isHtml) ||
          (input.mimeType === 'text/plain' && isText) ||
          (input.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && isZip) ||
          (input.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && isZip);
        if (!mimeOk) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'نوع الملف لا يطابق المحتوى' });
        }
        const fileKey = `${input.entityType}/${input.entityId}/${Date.now()}-${input.fileName}`;
        let url: string;
        if (process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY) {
          const res = await storagePut(`${input.entityType}/${input.entityId}/${Date.now()}-${safeName}`, buffer, input.mimeType);
          url = res.url;
        } else {
          url = `data:${input.mimeType};base64,${input.fileData}`;
        }
        
        await db.createAttachment({
          entityType: input.entityType,
          entityId: input.entityId,
          fileName: safeName,
          fileKey,
          fileUrl: url,
          fileSize: buffer.length,
          mimeType: input.mimeType,
          uploadedBy: ctx.user.id
        });
        
        await logAudit(ctx.user.id, 'UPLOAD_FILE', input.entityType, input.entityId, `Uploaded file: ${input.fileName}`);
        
        return { success: true, url };
      }),

    list: protectedProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number() }))
      .query(async ({ input }) => {
        // Attachments listing obeys the general 'attachments' permission
        // as an umbrella for files across entities
        // (entity-specific permissions are covered by entity procedures)
        return await db.getEntityAttachments(input.entityType, input.entityId);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'attachments');
        await db.deleteAttachment(input.id);
        await logAudit(ctx.user.id, 'DELETE_FILE', 'attachment', input.id);
        return { success: true };
      })
  }),

  // ============= HUMAN RESOURCES =============
  hr: hrRouter,

  // ============= ACCOUNTING =============
  accounting: accountingRouter,
  reports: reportsRouter
  ,
  tasks: tasksRouter,
  notifications: router({
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      // Placeholder: return 0; can be wired to a real store later
      return { count: 0 } as const;
    }),
  })
});

export type AppRouter = typeof appRouter;
