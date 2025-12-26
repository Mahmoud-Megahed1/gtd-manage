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
import { approvalsRouter } from "./routers/approvals";
import { notificationsRouter } from "./routers/notifications";
import { generalReportsRouter } from "./routers/generalReports";
import { invoices, expenses } from "../drizzle/schema";
import { gte, eq, desc } from "drizzle-orm";

// Helper to generate unique numbers
function generateUniqueNumber(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

// Permission levels for granular access control
type PermissionLevel = 'full' | 'own' | 'readonly' | 'none';

// Detailed sub-permissions for each section
type SubPermissions = {
  view: boolean;
  viewOwn: boolean;
  viewFinancials: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  submit: boolean;
};

type DetailedPermissions = {
  hr: SubPermissions;
  projects: SubPermissions;
  tasks: SubPermissions;
  accounting: SubPermissions;
  clients: SubPermissions;
  forms: SubPermissions;
  invoices: SubPermissions;
  reports: SubPermissions;
};

function getPermissionLevel(role: string, section: string): PermissionLevel {
  // Admin has full access everywhere
  if (role === 'admin') return 'full';

  // Define permission matrix: role -> section -> level
  const permissionMatrix: Record<string, Record<string, PermissionLevel>> = {
    // HR Manager - full access to HR
    hr_manager: { hr: 'full', dashboard: 'full' },
    // Finance roles
    finance_manager: { accounting: 'full', reports: 'full', dashboard: 'full', hr: 'own' },
    accountant: { accounting: 'readonly', reports: 'readonly', dashboard: 'readonly', hr: 'own' },
    // Project roles
    project_manager: { projects: 'full', tasks: 'full', dashboard: 'full', hr: 'own' },
    site_engineer: { projects: 'own', tasks: 'own', dashboard: 'readonly', hr: 'own' },
    planning_engineer: { projects: 'own', tasks: 'own', dashboard: 'readonly', hr: 'own' },
    architect: { projects: 'own', tasks: 'own', dashboard: 'readonly', hr: 'own' },
    interior_designer: { projects: 'own', tasks: 'own', dashboard: 'readonly', hr: 'own' },
    designer: { projects: 'own', tasks: 'own', hr: 'own', dashboard: 'readonly' },
    // Regular employees - can only see their own data in HR
    employee: { hr: 'own', dashboard: 'readonly' },
    // Other roles
    sales_manager: { clients: 'full', invoices: 'full', dashboard: 'full', hr: 'own' },
    procurement_officer: { procurement: 'full', purchases: 'full', dashboard: 'readonly', hr: 'own' },
    document_controller: { documents: 'full', attachments: 'full', dashboard: 'readonly', hr: 'own' },
    qa_qc: { qaqc: 'full', dashboard: 'readonly', hr: 'own' },
    storekeeper: { procurement: 'readonly', dashboard: 'readonly', hr: 'own' },
    viewer: { dashboard: 'readonly' },
  };

  const rolePerms = permissionMatrix[role];
  if (!rolePerms) return 'none';

  return rolePerms[section] || 'none';
}

// Get detailed sub-permissions for a role
function getDetailedPermissions(role: string): DetailedPermissions {
  const fullPerms: SubPermissions = { view: true, viewOwn: true, viewFinancials: true, create: true, edit: true, delete: true, approve: true, submit: true };
  const ownPerms: SubPermissions = { view: false, viewOwn: true, viewFinancials: false, create: false, edit: false, delete: false, approve: false, submit: true };
  const readonlyPerms: SubPermissions = { view: true, viewOwn: true, viewFinancials: false, create: false, edit: false, delete: false, approve: false, submit: false };
  const nonePerms: SubPermissions = { view: false, viewOwn: false, viewFinancials: false, create: false, edit: false, delete: false, approve: false, submit: false };

  if (role === 'admin') {
    return { hr: fullPerms, projects: fullPerms, tasks: fullPerms, accounting: fullPerms, clients: fullPerms, forms: fullPerms, invoices: fullPerms, reports: fullPerms };
  }

  const rolePermsMap: Record<string, DetailedPermissions> = {
    // إدارة الموارد البشرية
    hr_manager: {
      hr: fullPerms,
      projects: readonlyPerms,
      tasks: readonlyPerms,
      accounting: nonePerms,
      clients: readonlyPerms,
      forms: readonlyPerms,
      invoices: nonePerms,
      reports: nonePerms,
    },

    // الإدارة المالية
    finance_manager: {
      hr: ownPerms,
      projects: { ...readonlyPerms, viewFinancials: true },
      tasks: nonePerms,
      accounting: fullPerms,
      clients: readonlyPerms,
      forms: nonePerms,
      invoices: fullPerms,
      reports: fullPerms,
    },
    accountant: {
      hr: ownPerms,
      projects: nonePerms,
      tasks: nonePerms,
      accounting: { ...readonlyPerms, submit: true },
      clients: readonlyPerms,
      forms: nonePerms,
      invoices: { ...readonlyPerms, create: true },
      reports: readonlyPerms,
    },

    // إدارة المشاريع
    department_manager: {
      hr: { ...ownPerms, view: true },
      projects: fullPerms,
      tasks: fullPerms,
      accounting: readonlyPerms,
      clients: readonlyPerms,
      forms: fullPerms,
      invoices: readonlyPerms,
      reports: { ...readonlyPerms, create: true },
    },
    project_manager: {
      hr: ownPerms,
      projects: fullPerms,
      tasks: fullPerms,
      accounting: { ...readonlyPerms, viewFinancials: true },
      clients: readonlyPerms,
      forms: fullPerms,
      invoices: nonePerms,
      reports: { ...readonlyPerms, create: true },
    },
    project_coordinator: {
      hr: ownPerms,
      projects: { ...readonlyPerms, edit: true },
      tasks: { ...ownPerms, edit: true, create: true },
      accounting: nonePerms,
      clients: readonlyPerms,
      forms: readonlyPerms,
      invoices: nonePerms,
      reports: nonePerms,
    },

    // المهندسين والفنيين
    architect: {
      hr: { ...ownPerms, submit: true },
      projects: { ...ownPerms, view: false, viewOwn: true },
      tasks: { ...ownPerms, edit: true },
      accounting: nonePerms,
      clients: nonePerms,
      forms: nonePerms,
      invoices: nonePerms,
      reports: nonePerms,
    },
    interior_designer: {
      hr: { ...ownPerms, submit: true },
      projects: { ...ownPerms, view: false, viewOwn: true },
      tasks: { ...ownPerms, edit: true },
      accounting: nonePerms,
      clients: nonePerms,
      forms: nonePerms,
      invoices: nonePerms,
      reports: nonePerms,
    },
    site_engineer: {
      hr: { ...ownPerms, submit: true },
      projects: { ...ownPerms, view: false, viewOwn: true },
      tasks: { ...ownPerms, edit: true },
      accounting: nonePerms,
      clients: nonePerms,
      forms: nonePerms,
      invoices: nonePerms,
      reports: nonePerms,
    },
    planning_engineer: {
      hr: { ...ownPerms, submit: true },
      projects: { ...ownPerms, view: false, viewOwn: true },
      tasks: { ...ownPerms, edit: true, create: true },
      accounting: nonePerms,
      clients: nonePerms,
      forms: nonePerms,
      invoices: nonePerms,
      reports: readonlyPerms,
    },
    designer: {
      hr: { ...ownPerms, submit: true },
      projects: { ...ownPerms, view: false, viewOwn: true },
      tasks: { ...ownPerms, edit: true },
      accounting: nonePerms,
      clients: nonePerms,
      forms: nonePerms,
      invoices: nonePerms,
      reports: nonePerms,
    },
    technician: {
      hr: { ...ownPerms, submit: true },
      projects: { ...ownPerms, view: false, viewOwn: true },
      tasks: { ...ownPerms, edit: true },
      accounting: nonePerms,
      clients: nonePerms,
      forms: nonePerms,
      invoices: nonePerms,
      reports: nonePerms,
    },

    // المبيعات
    sales_manager: {
      hr: ownPerms,
      projects: readonlyPerms,
      tasks: nonePerms,
      accounting: { ...readonlyPerms, viewFinancials: true },
      clients: fullPerms,
      forms: fullPerms,
      invoices: fullPerms,
      reports: { ...readonlyPerms, create: true },
    },

    // الدعم الإداري
    admin_assistant: {
      hr: ownPerms,
      projects: readonlyPerms,
      tasks: readonlyPerms,
      accounting: nonePerms,
      clients: { ...readonlyPerms, create: true },
      forms: fullPerms,
      invoices: nonePerms,
      reports: nonePerms,
    },

    // المشتريات والمخازن
    procurement_officer: {
      hr: ownPerms,
      projects: readonlyPerms,
      tasks: nonePerms,
      accounting: readonlyPerms,
      clients: nonePerms,
      forms: nonePerms,
      invoices: nonePerms,
      reports: readonlyPerms,
    },
    storekeeper: {
      hr: ownPerms,
      projects: nonePerms,
      tasks: nonePerms,
      accounting: nonePerms,
      clients: nonePerms,
      forms: nonePerms,
      invoices: nonePerms,
      reports: nonePerms,
    },

    // ضبط الجودة
    qa_qc: {
      hr: ownPerms,
      projects: readonlyPerms,
      tasks: { ...readonlyPerms, edit: true },
      accounting: nonePerms,
      clients: nonePerms,
      forms: nonePerms,
      invoices: nonePerms,
      reports: readonlyPerms,
    },

    // موظف عادي (fallback)
    employee: {
      hr: { ...ownPerms, submit: true },
      projects: nonePerms,
      tasks: nonePerms,
      accounting: nonePerms,
      clients: nonePerms,
      forms: nonePerms,
      invoices: nonePerms,
      reports: nonePerms,
    },
  };

  return rolePermsMap[role] || { hr: nonePerms, projects: nonePerms, tasks: nonePerms, accounting: nonePerms, clients: nonePerms, forms: nonePerms, invoices: nonePerms, reports: nonePerms };
}

// Export permissions for frontend
export { getPermissionLevel, getDetailedPermissions };
export type { PermissionLevel, SubPermissions, DetailedPermissions };

// Get employee ID linked to user
async function getEmployeeIdForUser(userId: number): Promise<number | null> {
  const emp = await db.getEmployeeByUserId(userId);
  return emp?.id || null;
}

// Helper for audit logging - extracts IP from context
async function logAudit(
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
  // SECURITY: Permission checks apply in ALL environments (removed dev bypass)
  const role = ctx.user.role;
  const allowedByRole: Record<string, string[]> = {
    // === الإدارة العليا ===
    admin: ['*'],
    department_manager: ['projects', 'projectTasks', 'hr', 'reports', 'dashboard'],

    // === إدارة المشاريع ===
    project_manager: ['projects', 'projectTasks', 'rfis', 'submittals', 'drawings', 'projectReports', 'dashboard', 'clients', 'forms'],
    project_coordinator: ['projects', 'projectTasks', 'dashboard'],

    // === المهندسين والفنيين ===
    architect: ['projects', 'drawings', 'rfis', 'submittals', 'dashboard'],
    interior_designer: ['projects', 'drawings', 'dashboard'],
    site_engineer: ['projects', 'projectTasks', 'rfis', 'submittals', 'drawings', 'dashboard'],
    planning_engineer: ['projects', 'projectTasks', 'projectReports', 'dashboard'],
    designer: ['projects', 'projectTasks', 'dashboard'],
    technician: ['projectTasks', 'dashboard'],

    // === الإدارة المالية ===
    finance_manager: ['accounting', 'reports', 'dashboard', 'invoices', 'forms'],
    accountant: ['accounting', 'reports', 'dashboard', 'invoices'],

    // === المبيعات ===
    sales_manager: ['sales', 'clients', 'invoices', 'dashboard'],

    // === الموارد البشرية ===
    hr_manager: ['hr', 'dashboard'],
    admin_assistant: ['hr', 'dashboard'],

    // === المشتريات والمخازن ===
    procurement_officer: ['procurement', 'purchases', 'boq', 'dashboard'],
    storekeeper: ['procurement', 'dashboard'],
    qa_qc: ['qaqc', 'submittals', 'rfis', 'dashboard'],
  };
  const allowedList = allowedByRole[role] || [];
  const roleAllowed = allowedList.includes('*') || allowedList.includes(sectionKey);
  if (!roleAllowed) {
    // Log denied access attempt for security audit
    await db.createAuditLog({
      userId: ctx.user.id,
      action: 'ACCESS_DENIED',
      entityType: 'section',
      details: `Role "${role}" attempted to access "${sectionKey}" - DENIED`
    });
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Section access denied' });
  }
  const perms = await db.getUserPermissions(ctx.user.id);
  const record = perms?.permissionsJson ? JSON.parse(perms.permissionsJson) : {};
  if (record.hasOwnProperty(sectionKey) && !record[sectionKey]) {
    // Log denied access attempt due to user-specific restriction
    await db.createAuditLog({
      userId: ctx.user.id,
      action: 'ACCESS_DENIED',
      entityType: 'section',
      details: `User permission override denied access to "${sectionKey}"`
    });
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
    me: publicProcedure.query(async (opts) => {
      if (!opts.ctx.user) return null;
      // Fetch mustChangePassword flag from database
      const dbUser = await db.getUserById(opts.ctx.user.id);
      return {
        ...opts.ctx.user,
        mustChangePassword: dbUser ? Boolean((dbUser as any).mustChangePassword) : false
      };
    }),

    // Get current user's detailed permissions
    getMyPermissions: protectedProcedure.query(({ ctx }) => {
      const perms = getDetailedPermissions(ctx.user.role);
      return {
        role: ctx.user.role,
        permissions: perms,
        permissionLevel: {
          hr: getPermissionLevel(ctx.user.role, 'hr'),
          projects: getPermissionLevel(ctx.user.role, 'projects'),
          tasks: getPermissionLevel(ctx.user.role, 'tasks'),
          accounting: getPermissionLevel(ctx.user.role, 'accounting'),
          clients: getPermissionLevel(ctx.user.role, 'clients'),
          dashboard: getPermissionLevel(ctx.user.role, 'dashboard'),
        }
      };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Clear cookie by setting it to empty with immediate expiration
      ctx.res.cookie(COOKIE_NAME, "", {
        ...cookieOptions,
        maxAge: 0,
        expires: new Date(0)
      });
      if (ctx.user) {
        logAudit(ctx.user.id, 'LOGOUT', 'user', ctx.user.id, undefined, ctx);
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
    // Password-based login
    loginWithPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1)
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'بيانات الدخول غير صحيحة' });
        }
        if (!user.passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'لم يتم تعيين كلمة سر لهذا الحساب' });
        }

        // Check if temp password is expired
        const mustChangePassword = Boolean((user as any).mustChangePassword);
        const tempPasswordExpiresAt = (user as any).tempPasswordExpiresAt;
        if (mustChangePassword && tempPasswordExpiresAt) {
          const expiresAt = new Date(tempPasswordExpiresAt);
          if (new Date() > expiresAt) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'انتهت صلاحية كلمة السر المؤقتة. يرجى طلب كلمة سر جديدة من المدير.'
            });
          }
        }

        // Use simple hash comparison
        const crypto = await import('crypto');
        const hashInput = crypto.createHash('sha256').update(input.password).digest('hex');
        if (hashInput !== user.passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'بيانات الدخول غير صحيحة' });
        }
        // Create session token
        const jwtModule = await import('jsonwebtoken');
        const jwt = jwtModule.default || jwtModule;
        const secret = process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'fallback-secret';
        const token = jwt.sign(
          { openId: user.openId, appId: process.env.VITE_APP_ID || 'gtd', name: user.name || '' },
          secret,
          { expiresIn: '7d' }
        );
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        // Update last signed in
        await db.updateUserLastSignedIn(user.id);
        await logAudit(user.id, 'LOGIN_PASSWORD', 'user', user.id, undefined, ctx);

        return {
          success: true,
          mustChangePassword,
          user: { id: user.id, name: user.name, email: user.email, role: user.role }
        };
      }),
  }),

  // ============= CLIENTS =============
  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await ensurePerm(ctx, 'clients');
      return await db.getAllClients();
    }),

    // Lightweight endpoint for client names only - accessible to all authenticated users
    clientNames: protectedProcedure.query(async () => {
      const clients = await db.getAllClients();
      return clients.map(c => ({ id: c.id, name: c.name }));
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
        // Only admin and sales_manager can create clients
        const canCreate = ['admin', 'sales_manager'].includes(ctx.user.role);
        if (!canCreate) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'لا يمكنك إضافة عملاء - صلاحية المشاهدة فقط' });
        }

        const clientNumber = generateUniqueNumber('CLT');
        await db.createClient({
          ...input,
          clientNumber,
          createdBy: ctx.user.id
        });

        await logAudit(ctx.user.id, 'CREATE_CLIENT', 'client', undefined, `Created client: ${input.name}`, ctx);
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
        // Only admin and sales_manager can update clients
        const canEdit = ['admin', 'sales_manager'].includes(ctx.user.role);
        if (!canEdit) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'لا يمكنك تعديل بيانات العملاء - صلاحية المشاهدة فقط' });
        }

        const { id, ...data } = input;
        await db.updateClient(id, data);
        await logAudit(ctx.user.id, 'UPDATE_CLIENT', 'client', id, `Updated client`, ctx);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'clients');
        await db.deleteClient(input.id);
        await logAudit(ctx.user.id, 'DELETE_CLIENT', 'client', input.id, undefined, ctx);
        return { success: true };
      })
  }),

  // ============= PROJECTS =============
  projects: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const permLevel = getPermissionLevel(ctx.user.role, 'projects');

        // Check if user can view financials
        const designerRoles = ['designer', 'architect', 'site_engineer', 'interior_designer', 'planning_engineer'];
        const isDesigner = designerRoles.includes(ctx.user.role);

        let projects;
        // For 'own' permission level, only show assigned projects
        if (permLevel === 'own') {
          projects = await db.getProjectsForAssignee(ctx.user.id);
        } else {
          projects = await db.getAllProjects();
        }

        // Filter by client if requested
        if (input?.clientId) {
          projects = projects.filter((p: any) => p.clientId === input.clientId);
        }

        // Strip budget for designers
        if (isDesigner) {
          return projects.map((p: any) => ({ ...p, budget: undefined }));
        }

        return projects;
      }),

    // Get projects assigned to current user (for limited access roles)
    myProjects: protectedProcedure.query(async ({ ctx }) => {
      return await db.getProjectsForAssignee(ctx.user.id);
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
        // projectType is REQUIRED and IMMUTABLE after creation
        projectType: z.enum(['design', 'execution', 'design_execution', 'supervision']),
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

        await logAudit(ctx.user.id, 'CREATE_PROJECT', 'project', undefined, `Created project: ${input.name}`, ctx);
        return { success: true, projectNumber };
      }),

    update: managerProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        // status is lifecycle state (can be changed), projectType is immutable
        status: z.enum(['in_progress', 'delivered', 'cancelled']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        budget: z.number().optional(),
        assignedTo: z.number().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const { id, ...data } = input;

        // Get current project for comparison
        const currentProject = await db.getProjectById(id);

        // Status transition guard - prevent invalid transitions
        // Valid: in_progress → delivered, in_progress → cancelled
        // Invalid: cancelled → *, delivered → * (except by admin)
        if (input.status && currentProject) {
          const currentStatus = currentProject.status;
          const newStatus = input.status;

          if (currentStatus !== newStatus) {
            // Only allow transitions FROM in_progress
            if (currentStatus !== 'in_progress' && ctx.user.role !== 'admin') {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: `لا يمكن تغيير حالة المشروع من "${currentStatus}" - فقط المدير يمكنه ذلك`
              });
            }
          }
        }

        await db.updateProject(id, data);

        await logAudit(ctx.user.id, 'UPDATE_PROJECT', 'project', id, undefined, ctx);

        // Notify assignedTo user if changed
        if (input.assignedTo && currentProject && input.assignedTo !== currentProject.assignedTo) {
          const { createNotification } = await import('./routers/notifications');
          await createNotification({
            userId: input.assignedTo,
            fromUserId: ctx.user.id,
            type: 'info',
            title: 'تم إسناد مشروع جديد لك 📋',
            message: `تم إسنادك للمشروع: ${currentProject.name}`,
            entityType: 'project',
            entityId: id,
            link: `/projects/${id}`
          });
        }

        // Notify team about status change
        if (input.status && currentProject && input.status !== currentProject.status) {
          const conn = await db.getDb();
          if (conn) {
            const { projectTeam, users } = await import('../drizzle/schema');
            const teamMembers = await conn.select({ userId: projectTeam.userId })
              .from(projectTeam)
              .where(eq(projectTeam.projectId, id));

            if (teamMembers.length > 0) {
              const { createNotification } = await import('./routers/notifications');
              const statusNames: Record<string, string> = {
                'in_progress': 'قيد التقدم',
                'delivered': 'تم التسليم',
                'cancelled': 'ملغي'
              };

              for (const member of teamMembers) {
                if (member.userId && member.userId !== ctx.user.id) {
                  await createNotification({
                    userId: member.userId,
                    fromUserId: ctx.user.id,
                    type: 'info',
                    title: 'تغيير حالة المشروع 📊',
                    message: `تم تغيير حالة مشروع "${currentProject.name}" إلى: ${statusNames[input.status] || input.status}`,
                    entityType: 'project',
                    entityId: id,
                    link: `/projects/${id}`
                  });
                }
              }
            }
          }
        }

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        await db.deleteProject(input.id);
        await logAudit(ctx.user.id, 'DELETE_PROJECT', 'project', input.id, undefined, ctx);
        return { success: true };
      }),

    getDetails: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const project = await db.getProjectById(input.id);
        if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });

        // Check if user can view financials
        const designerRoles = ['designer', 'architect', 'site_engineer', 'interior_designer', 'planning_engineer'];
        const isDesigner = designerRoles.includes(ctx.user.role);
        const canViewFinancials = !isDesigner;

        const [boq, expenses, installments, client] = await Promise.all([
          canViewFinancials ? db.getProjectBOQ(input.id) : Promise.resolve([]),
          canViewFinancials ? db.getProjectExpenses(input.id) : Promise.resolve([]),
          canViewFinancials ? db.getProjectInstallments(input.id) : Promise.resolve([]),
          project.clientId ? db.getClientById(project.clientId) : null
        ]);

        // Strip budget from project for designers
        const safeProject = isDesigner
          ? { ...project, budget: undefined }
          : project;

        return { project: safeProject, boq, expenses, installments, client };
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
        await logAudit(ctx.user.id, 'CREATE_TASK', 'project', input.projectId, `Task: ${input.name}`, ctx);
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
        await logAudit(ctx.user.id, 'DELETE_TASK', 'task', input.id, undefined, ctx);
        return { success: true };
      }),

    // Team management
    listTeam: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) return [];
        const { projectTeam, users } = await import("../drizzle/schema");
        const rows = await conn
          .select({
            id: projectTeam.id,
            projectId: projectTeam.projectId,
            userId: projectTeam.userId,
            role: projectTeam.role,
            joinedAt: projectTeam.joinedAt,
            userName: users.name,
            userEmail: users.email
          })
          .from(projectTeam)
          .leftJoin(users, eq(projectTeam.userId, users.id))
          .where(eq(projectTeam.projectId, input.projectId));
        return rows;
      }),

    addTeamMember: managerProcedure
      .input(z.object({ projectId: z.number(), userId: z.number(), role: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { projectTeam } = await import("../drizzle/schema");
        try {
          await conn.insert(projectTeam).values({
            projectId: input.projectId,
            userId: input.userId,
            role: input.role || 'member'
          } as any);
          await logAudit(ctx.user.id, 'ADD_TEAM_MEMBER', 'project', input.projectId, `Added user ${input.userId}`, ctx);

          // Notify added user
          const project = await db.getProjectById(input.projectId);
          if (project && input.userId !== ctx.user.id) {
            const { createNotification } = await import('./routers/notifications');
            await createNotification({
              userId: input.userId,
              fromUserId: ctx.user.id,
              type: 'success',
              title: 'تمت إضافتك لفريق مشروع 👥',
              message: `تم إضافتك لفريق المشروع: ${project.name}`,
              entityType: 'project',
              entityId: input.projectId,
              link: `/projects/${input.projectId}`
            });
          }

          return { success: true };
        } catch (e: any) {
          if (e.code === 'ER_DUP_ENTRY') {
            throw new TRPCError({ code: 'CONFLICT', message: 'هذا المستخدم موجود بالفعل في الفريق' });
          }
          throw e;
        }
      }),

    removeTeamMember: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { projectTeam } = await import("../drizzle/schema");
        await conn.delete(projectTeam).where(eq(projectTeam.id, input.id));
        await logAudit(ctx.user.id, 'REMOVE_TEAM_MEMBER', 'projectTeam', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'CREATE_RFI', 'project', input.projectId, rfiNumber, ctx);
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
        await logAudit(ctx.user.id, 'ANSWER_RFI', 'rfi', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'CLOSE_RFI', 'rfi', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'DELETE_RFI', 'rfi', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'CREATE_SUBMITTAL', 'project', input.projectId, code, ctx);
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
        await logAudit(ctx.user.id, 'APPROVE_SUBMITTAL', 'submittal', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'REJECT_SUBMITTAL', 'submittal', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'DELETE_SUBMITTAL', 'submittal', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'CREATE_DRAWING', 'project', input.projectId, input.drawingCode, ctx);
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
        await logAudit(ctx.user.id, 'ADD_DRAWING_VERSION', 'drawing', input.drawingId, input.version, ctx);
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
        await logAudit(ctx.user.id, 'DELETE_DRAWING', 'drawing', input.id, undefined, ctx);
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
      .input(z.object({
        type: z.enum(['invoice', 'quote']).optional(),
        search: z.string().optional()
      }))
      .query(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'invoices');
        let allInvoices = await db.getAllInvoices();

        if (input.type) {
          allInvoices = allInvoices.filter(inv => inv.type === input.type);
        }

        if (input.search) {
          const lower = input.search.toLowerCase();
          allInvoices = allInvoices.filter(inv =>
            (inv.invoiceNumber || '').toLowerCase().includes(lower) ||
            (inv.clientName || '').toLowerCase().includes(lower) ||
            (inv.notes || '').toLowerCase().includes(lower)
          );
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
        invoiceNumber: z.string().optional(),
        items: z.array(z.object({
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          total: z.number()
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        // Only admin, finance_manager, sales_manager can CREATE invoices
        const canCreate = ['admin', 'finance_manager', 'sales_manager'].includes(ctx.user.role);
        if (!canCreate) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'لا يمكنك إنشاء فواتير - صلاحية المشاهدة فقط' });
        }

        const invoiceNumber = input.invoiceNumber || generateUniqueNumber(input.type === 'invoice' ? 'INV' : 'QUO');
        const { items, ...invoiceData } = input;

        const result = await db.createInvoice({
          ...invoiceData,
          invoiceNumber,
          createdBy: ctx.user.id
        });

        // MySQL2 returns [ResultSetHeader, FieldPacket[]] - extract insertId properly
        const resultData = Array.isArray(result) ? result[0] : result;
        const invoiceId = Number((resultData as any)?.insertId || (resultData as any)?.id || 0);

        // Only create items if invoiceId is valid
        if (invoiceId && !isNaN(invoiceId) && invoiceId > 0) {
          for (let i = 0; i < items.length; i++) {
            await db.createInvoiceItem({
              invoiceId,
              ...items[i],
              sortOrder: i
            });
          }
        }


        // Only log audit if invoiceId is valid
        if (invoiceId && !isNaN(invoiceId) && invoiceId > 0) {
          await logAudit(ctx.user.id, 'CREATE_INVOICE', 'invoice', invoiceId, `Created ${input.type}: ${invoiceNumber}`, ctx);

          // INTEGRATION: Create corresponding sale record for accounting if it's an invoice
          if (input.type === 'invoice') {
            const saleNumber = generateUniqueNumber('SAL');
            await db.createSale({
              saleNumber,
              clientId: input.clientId,
              projectId: input.projectId,
              description: `Invoice #${invoiceNumber}`,
              amount: input.total,
              paymentMethod: 'bank_transfer', // Default to bank_transfer or need UI input
              saleDate: input.issueDate,
              status: 'pending', // Pending payment
              invoiceId: invoiceId,
              createdBy: ctx.user.id
            });
          }
        }

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
        formData: z.string().optional(),
        // Expanded fields for full edit
        clientId: z.number().optional(),
        projectId: z.number().optional(),
        issueDate: z.date().optional(),
        subtotal: z.number().optional(),
        tax: z.number().optional(),
        discount: z.number().optional(),
        total: z.number().optional(),
        items: z.array(z.object({
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          total: z.number()
        })).optional()
      }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'invoices');
        const { id, items, ...data } = input;

        // 1. Update Invoice Header
        await db.updateInvoice(id, data);

        // 2. Update Items if provided
        if (items) {
          // Delete old items using the same logic as deleteInvoice (direct DB call since no specific helper exposed)
          // Start by getting connection to delete existing items
          const database = await db.getDb();
          if (database) {
            // We need to import invoiceItems table reference, but we are in routers.ts
            // Best to use a helper in db.ts if possible, or use the existing deleteInvoiceItem one by one? 
            // Too slow. Let's use `db.deleteInvoiceItemsByInvoiceId` if I add it, or just use raw `deleteInvoice` logic via a new helper.
            // Actually, `db.deleteInvoice` deletes items. 
            // Let's rely on `db.updateInvoiceWithItems` helper that I should add to db.ts?
            // OR: Since I can't easily import schema here without potentially breaking things or circular deps,
            // I will add `replaceInvoiceItems` to `server/db.ts` and call it.
            await db.replaceInvoiceItems(id, items.map((item, idx) => ({
              invoiceId: id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              sortOrder: idx
            })));
          }
        }

        // 3. INTEGRATION: Update sale status/amount
        if (data.status || data.total) {
          const updateData: any = {};

          if (data.status) {
            const statusMap: Record<string, string> = {
              'draft': 'pending',
              'sent': 'pending',
              'paid': 'completed',
              'cancelled': 'cancelled'
            };
            updateData.status = (statusMap[data.status] || 'pending');
          }

          if (data.total !== undefined) {
            updateData.amount = data.total;
          }

          if (Object.keys(updateData).length > 0) {
            await db.updateSaleByInvoiceId(id, updateData);
          }
        }

        await logAudit(ctx.user.id, 'UPDATE_INVOICE', 'invoice', id, undefined, ctx);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'invoices');
        // INTEGRATION: Delete linked sale record
        await db.deleteSaleByInvoiceId(input.id);

        await db.deleteInvoice(input.id);
        await logAudit(ctx.user.id, 'DELETE_INVOICE', 'invoice', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'CREATE_CHANGE_ORDER', 'changeOrder', id, `CO ${code}`, ctx);
        return { success: true, id, code };
      }),
    submit: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        await db.updateChangeOrder(input.id, { status: 'submitted', submittedBy: ctx.user.id, submittedAt: new Date() });
        await logAudit(ctx.user.id, 'SUBMIT_CHANGE_ORDER', 'changeOrder', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'APPROVE_CHANGE_ORDER', 'changeOrder', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'REJECT_CHANGE_ORDER', 'changeOrder', input.id, input.reason, ctx);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'projects');
        await db.deleteChangeOrder(input.id);
        await logAudit(ctx.user.id, 'DELETE_CHANGE_ORDER', 'changeOrder', input.id, undefined, ctx);
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

        // MySQL2 returns [ResultSetHeader, FieldPacket[]] - extract insertId properly
        const resultData = Array.isArray(result) ? result[0] : result;
        let formId = Number((resultData as any)?.insertId || (resultData as any)?.id || 0);

        // Fallback: query for the form if insertId is not available
        if (!formId || isNaN(formId) || formId <= 0) {
          const all = await db.getAllForms();
          const match = all.find((f: any) => f.formNumber === formNumber);
          formId = Number(match?.id) || 0;
        }

        // Only log audit if formId is valid
        if (formId && !isNaN(formId) && formId > 0) {
          await logAudit(ctx.user.id, 'CREATE_FORM', 'form', formId, `Created form: ${formNumber}`, ctx);
        }

        // Notify owner
        await notifyOwner({
          title: 'استمارة عميل جديدة',
          content: `تم إضافة استمارة جديدة رقم ${formNumber}`
        });

        return { success: true, id: formId || undefined, formNumber };
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
        await logAudit(ctx.user.id, 'UPDATE_FORM', 'form', id, undefined, ctx);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ensurePerm(ctx, 'forms');
        await db.deleteForm(input.id);
        await logAudit(ctx.user.id, 'DELETE_FORM', 'form', input.id, undefined, ctx);
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
        await logAudit(ctx.user.id, 'UPDATE_SETTING', 'setting', undefined, `Updated setting: ${input.key}`, ctx);
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
          // الإدارة العليا
          'admin', 'department_manager',
          // إدارة المشاريع
          'project_manager', 'project_coordinator',
          // المهندسين والفنيين
          'architect', 'interior_designer', 'site_engineer', 'planning_engineer', 'designer', 'technician',
          // الإدارة المالية
          'finance_manager', 'accountant',
          // المبيعات
          'sales_manager',
          // الموارد البشرية
          'hr_manager', 'admin_assistant',
          // المشتريات والمخازن
          'procurement_officer', 'storekeeper', 'qa_qc'
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

        await logAudit(ctx.user.id, 'CREATE_USER', 'user', user.id, `Created user ${input.email} with role ${input.role}`, ctx);
        return user;
      }),

    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum([
          'admin', 'department_manager', 'project_manager', 'project_coordinator',
          'architect', 'interior_designer', 'site_engineer', 'planning_engineer', 'designer', 'technician',
          'finance_manager', 'accountant', 'sales_manager',
          'hr_manager', 'admin_assistant', 'procurement_officer', 'storekeeper', 'qa_qc'
        ]).optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const role = (input.role ?? 'designer') as any;
        await db.updateUserRole(input.userId, role);

        // SYNC: Update employee position to match role
        const roleToPosition: Record<string, string> = {
          'admin': 'مدير عام',
          'department_manager': 'مدير قسم',
          'project_manager': 'مدير مشاريع',
          'project_coordinator': 'منسق مشاريع',
          'architect': 'مهندس معماري',
          'interior_designer': 'مصمم داخلي',
          'site_engineer': 'مهندس موقع',
          'planning_engineer': 'مهندس تخطيط',
          'designer': 'مصمم',
          'technician': 'فني',
          'finance_manager': 'مدير مالي',
          'accountant': 'محاسب',
          'sales_manager': 'مسؤول مبيعات',
          'hr_manager': 'مسؤول موارد بشرية',
          'admin_assistant': 'مساعد إداري',
          'procurement_officer': 'مسؤول مشتريات',
          'storekeeper': 'أمين مخازن',
          'qa_qc': 'مسؤول جودة',
        };
        const newPosition = roleToPosition[role];
        if (newPosition) {
          const employee = await db.getEmployeeByUserId(input.userId);
          if (employee) {
            // Update existing employee position
            const conn = await db.getDb();
            if (conn) {
              const { employees } = await import('../drizzle/schema');
              const { eq } = await import('drizzle-orm');
              await conn.update(employees).set({ position: newPosition }).where(eq(employees.id, employee.id));
            }
          } else {
            // AUTO-CREATE: If no employee record exists, create one
            const conn = await db.getDb();
            if (conn) {
              const { employees, users } = await import('../drizzle/schema');
              const { eq } = await import('drizzle-orm');

              // Get user info for employee number
              const userRecord = await conn.select().from(users).where(eq(users.id, input.userId)).limit(1);
              if (userRecord.length > 0) {
                const empNumber = `EMP-${input.userId}-${Date.now().toString().slice(-4)}`;
                await conn.insert(employees).values({
                  userId: input.userId,
                  employeeNumber: empNumber,
                  position: newPosition,
                  hireDate: new Date(),
                  status: 'active'
                } as any);
                console.log(`[AUTO-CREATE] Created employee record for user ${input.userId}: ${empNumber}`);
              }
            }
          }
        }

        await logAudit(ctx.user.id, 'UPDATE_USER_ROLE', 'user', input.userId, `Changed role to ${input.role}`, ctx);

        // Send notification to user about role change
        const { createNotification } = await import('./routers/notifications');
        const roleNames: Record<string, string> = {
          'admin': 'مدير عام',
          'department_manager': 'مدير قسم',
          'project_manager': 'مدير مشاريع',
          'project_coordinator': 'منسق مشاريع',
          'architect': 'مهندس معماري',
          'interior_designer': 'مصمم داخلي',
          'site_engineer': 'مهندس موقع',
          'planning_engineer': 'مهندس تخطيط',
          'designer': 'مصمم',
          'technician': 'فني',
          'finance_manager': 'مدير مالي',
          'accountant': 'محاسب',
          'sales_manager': 'مسؤول مبيعات',
          'hr_manager': 'مسؤول موارد بشرية',
          'admin_assistant': 'مساعد إداري',
          'procurement_officer': 'مسؤول مشتريات',
          'storekeeper': 'أمين مخازن',
          'qa_qc': 'مسؤول جودة',
        };
        await createNotification({
          userId: input.userId,
          fromUserId: ctx.user.id,
          type: 'info',
          title: 'تم تغيير دورك',
          message: `تم تغيير دورك إلى: ${roleNames[role] || role}`,
          link: '/settings'
        });

        // Return requiresRelogin to notify frontend that user needs to re-login
        return { success: true, requiresRelogin: true, message: 'تم تغيير الدور - المستخدم يحتاج تسجيل خروج ودخول للتفعيل' };
      }),

    update: adminProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum([
          'admin', 'department_manager', 'project_manager', 'project_coordinator',
          'architect', 'interior_designer', 'site_engineer', 'planning_engineer', 'designer', 'technician',
          'finance_manager', 'accountant', 'sales_manager',
          'hr_manager', 'admin_assistant', 'procurement_officer', 'storekeeper', 'qa_qc'
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

        // SYNC: If role changed, update employee position too
        if (updateData.role) {
          const roleToPosition: Record<string, string> = {
            'admin': 'مدير عام',
            'department_manager': 'مدير قسم',
            'project_manager': 'مدير مشاريع',
            'project_coordinator': 'منسق مشاريع',
            'architect': 'مهندس معماري',
            'interior_designer': 'مصمم داخلي',
            'site_engineer': 'مهندس موقع',
            'planning_engineer': 'مهندس تخطيط',
            'designer': 'مصمم',
            'technician': 'فني',
            'finance_manager': 'مدير مالي',
            'accountant': 'محاسب',
            'sales_manager': 'مسؤول مبيعات',
            'hr_manager': 'مسؤول موارد بشرية',
            'admin_assistant': 'مساعد إداري',
            'procurement_officer': 'مسؤول مشتريات',
            'storekeeper': 'أمين مخازن',
            'qa_qc': 'مسؤول جودة',
          };
          const newPosition = roleToPosition[updateData.role];
          if (newPosition) {
            const employee = await db.getEmployeeByUserId(userId);
            if (employee) {
              const conn = await db.getDb();
              if (conn) {
                const { employees } = await import('../drizzle/schema');
                const { eq } = await import('drizzle-orm');
                await conn.update(employees).set({ position: newPosition }).where(eq(employees.id, employee.id));
              }
            }
          }
        }

        await logAudit(ctx.user.id, 'UPDATE_USER', 'user', userId, `Updated user information`, ctx);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({
        userId: z.number()
      }))
      .mutation(async ({ input, ctx }) => {
        // Prevent deleting yourself
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يمكنك حذف حسابك الشخصي' });
        }

        // Check if user has linked employee and delete it too
        const employee = await db.getEmployeeByUserId(input.userId);
        if (employee) {
          const conn = await db.getDb();
          if (conn) {
            const { employees } = await import('../drizzle/schema');
            await conn.delete(employees).where(eq(employees.id, employee.id));
            await logAudit(ctx.user.id, 'DELETE_EMPLOYEE', 'employee', employee.id, `Deleted employee linked to user ${input.userId}`, ctx);
          }
        }

        await db.deleteUser(input.userId);
        await logAudit(ctx.user.id, 'DELETE_USER', 'user', input.userId, employee ? 'Deleted user and linked employee' : 'Deleted user', ctx);
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
        console.log("[setPermissions] Saving for userId:", input.userId, input.permissions);
        await db.setUserPermissions(input.userId, input.permissions);
        console.log("[setPermissions] Saved successfully");
        await logAudit(ctx.user.id, 'UPDATE_USER_PERMISSIONS', 'user', input.userId, `Updated permissions`, ctx);

        // Notify user about permission change
        const { createNotification } = await import('./routers/notifications');
        await createNotification({
          userId: input.userId,
          fromUserId: ctx.user.id,
          type: 'info',
          title: 'تم تحديث صلاحياتك',
          message: 'تم تعديل صلاحياتك في النظام - قد تحتاج لإعادة تسجيل الدخول',
          link: '/settings'
        });

        return { success: true };
      }),
    // Admin sets password for a user
    setPassword: adminProcedure
      .input(z.object({
        userId: z.number(),
        password: z.string().min(4)
      }))
      .mutation(async ({ input, ctx }) => {
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(input.password).digest('hex');
        await db.setUserPassword(input.userId, hash);
        await logAudit(ctx.user.id, 'SET_USER_PASSWORD', 'user', input.userId, 'Password set by admin', ctx);

        // Send notification to user about new password
        const { createNotification } = await import('./routers/notifications');
        await createNotification({
          userId: input.userId,
          fromUserId: ctx.user.id,
          type: 'success',
          title: 'تم تعيين كلمة سر جديدة',
          message: `تم تعيين كلمة سر جديدة لحسابك بواسطة ${ctx.user.name || 'المدير'}`,
          link: '/'
        });

        return { success: true };
      }),
    // User changes their own password
    changeMyPassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(4)
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
        }
        const crypto = await import('crypto');
        const currentHash = crypto.createHash('sha256').update(input.currentPassword).digest('hex');
        if (user.passwordHash && user.passwordHash !== currentHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'كلمة السر الحالية غير صحيحة' });
        }
        const newHash = crypto.createHash('sha256').update(input.newPassword).digest('hex');
        await db.setUserPassword(ctx.user.id, newHash);

        // Clear mustChangePassword flag if it was set
        const conn = await db.getDb();
        if (conn) {
          const { users } = await import('../drizzle/schema');
          await conn.update(users)
            .set({ mustChangePassword: 0 })
            .where(eq(users.id, ctx.user.id));
        }

        await logAudit(ctx.user.id, 'CHANGE_PASSWORD', 'user', ctx.user.id, 'User changed their password', ctx);
        return { success: true };
      }),
    // Get user password info (admin only - shows if password is set)
    getPasswordInfo: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        return { hasPassword: !!user?.passwordHash };
      }),

    // User requests password reset (creates pending request for admin approval)
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        // Find user by email
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          // Don't reveal if email exists or not
          return { success: true, requestId: null, message: 'إذا كان البريد الإلكتروني موجوداً، سيتم إرسال طلب للمدير' };
        }

        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // Create pending password reset request
        const { passwordResetRequests, users } = await import('../drizzle/schema');
        const result = await conn.insert(passwordResetRequests).values({
          userId: user.id,
          status: 'pending'
        });
        const requestId = Number((result as any)[0]?.insertId);

        // Get user role for notification
        const userRole = (user as any).role || 'موظف';
        const roleNames: Record<string, string> = {
          admin: 'مدير النظام',
          hr_manager: 'مدير الموارد البشرية',
          project_manager: 'مدير مشاريع',
          accountant: 'محاسب',
          designer: 'مصمم',
        };

        // Notify admin about password reset request
        const { createNotificationForRoles } = await import('./routers/notifications');
        await createNotificationForRoles({
          roles: ['admin', 'hr_manager'],
          type: 'action',
          title: '🔐 طلب إعادة تعيين كلمة سر',
          message: `${user.name || user.email} (${roleNames[userRole] || userRole}) أرسل طلب نسيان كلمة المرور`,
          link: `/settings?resetRequest=${requestId}`
        });

        return { success: true, requestId, message: 'تم إرسال طلبك للمدير، يرجى الانتظار' };
      }),

    // Validate reset token (for UI to show reset form)
    validateResetToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const conn = await db.getDb();
        if (!conn) return { valid: false };

        const { passwordResetTokens, passwordResetRequests, users } = await import('../drizzle/schema');
        const { eq, and, gt, or } = await import('drizzle-orm');

        // First check passwordResetRequests table (new flow)
        const requestResult = await conn.select({
          request: passwordResetRequests,
          user: users
        })
          .from(passwordResetRequests)
          .leftJoin(users, eq(passwordResetRequests.userId, users.id))
          .where(and(
            eq(passwordResetRequests.resetToken, input.token),
            eq(passwordResetRequests.status, 'approved_link'),
            gt(passwordResetRequests.tokenExpiresAt, new Date())
          ))
          .limit(1);

        if (requestResult[0]) {
          return {
            valid: true,
            source: 'request',
            requestId: requestResult[0].request.id,
            userName: requestResult[0].user?.name,
            userEmail: requestResult[0].user?.email
          };
        }

        // Fallback to old passwordResetTokens table
        const tokenResult = await conn.select({
          token: passwordResetTokens,
          user: users
        })
          .from(passwordResetTokens)
          .leftJoin(users, eq(passwordResetTokens.userId, users.id))
          .where(and(
            eq(passwordResetTokens.token, input.token),
            eq(passwordResetTokens.used, 0),
            gt(passwordResetTokens.expiresAt, new Date())
          ))
          .limit(1);

        if (!tokenResult[0]) return { valid: false };

        return {
          valid: true,
          source: 'token',
          userName: tokenResult[0].user?.name,
          userEmail: tokenResult[0].user?.email
        };
      }),

    // Reset password using token (user sets their own password)
    resetPasswordWithToken: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(4)
      }))
      .mutation(async ({ input }) => {
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const { passwordResetTokens, passwordResetRequests, users } = await import('../drizzle/schema');
        const { eq, and, gt } = await import('drizzle-orm');

        // First check passwordResetRequests table (new flow)
        const requestResult = await conn.select()
          .from(passwordResetRequests)
          .where(and(
            eq(passwordResetRequests.resetToken, input.token),
            eq(passwordResetRequests.status, 'approved_link'),
            gt(passwordResetRequests.tokenExpiresAt, new Date())
          ))
          .limit(1);

        let userId: number;

        if (requestResult[0]) {
          // New flow
          userId = requestResult[0].userId;

          // Set new password
          const crypto = await import('crypto');
          const hash = crypto.createHash('sha256').update(input.newPassword).digest('hex');
          await db.setUserPassword(userId, hash);

          // Mark request as completed
          await conn.update(passwordResetRequests)
            .set({ status: 'completed', completedAt: new Date() })
            .where(eq(passwordResetRequests.id, requestResult[0].id));
        } else {
          // Fallback to old passwordResetTokens table
          const tokenResult = await conn.select()
            .from(passwordResetTokens)
            .where(and(
              eq(passwordResetTokens.token, input.token),
              eq(passwordResetTokens.used, 0),
              gt(passwordResetTokens.expiresAt, new Date())
            ))
            .limit(1);

          if (!tokenResult[0]) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'رابط غير صالح أو منتهي الصلاحية' });
          }

          userId = tokenResult[0].userId;

          // Set new password
          const crypto = await import('crypto');
          const hash = crypto.createHash('sha256').update(input.newPassword).digest('hex');
          await db.setUserPassword(userId, hash);

          // Mark token as used
          await conn.update(passwordResetTokens)
            .set({ used: 1 })
            .where(eq(passwordResetTokens.id, tokenResult[0].id));
        }

        // Notify user
        const { createNotification } = await import('./routers/notifications');
        await createNotification({
          userId,
          type: 'success',
          title: 'تم تغيير كلمة السر ✅',
          message: 'تم تغيير كلمة السر بنجاح',
          link: '/'
        });

        return { success: true, message: 'تم تغيير كلمة السر بنجاح' };
      }),

    // Admin sends a reset link to user
    sendResetLink: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Generate token
        const crypto = await import('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days - لا ينتهي إلا بعد الاستخدام أو 30 يوم

        // Save token
        const conn = await db.getDb();
        if (conn) {
          const { passwordResetTokens } = await import('../drizzle/schema');
          await conn.insert(passwordResetTokens).values({
            userId: input.userId,
            token,
            expiresAt,
            used: 0
          });
        }

        // Get server origin
        const origin = process.env.VITE_SERVER_ORIGIN || 'http://localhost:5000';
        const resetLink = `${origin}/reset-password/${token}`;

        // Send notification with link
        const { createNotification } = await import('./routers/notifications');
        await createNotification({
          userId: input.userId,
          fromUserId: ctx.user.id,
          type: 'action',
          title: '🔗 رابط تعيين كلمة سر جديدة',
          message: `تم إنشاء رابط لتعيين كلمة سر جديدة لحسابك. الرابط صالح لمدة 24 ساعة.`,
          link: `/reset-password/${token}`
        });

        await logAudit(ctx.user.id, 'SEND_RESET_LINK', 'user', input.userId, 'Admin sent password reset link', ctx);

        return { success: true, message: 'تم إرسال رابط التعيين للمستخدم' };
      }),

    // Admin sends temporary password that user must change on login
    sendTempPassword: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // Generate random password
        const crypto = await import('crypto');
        const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 char password

        // Hash and save
        const hash = crypto.createHash('sha256').update(tempPassword).digest('hex');
        const { users } = await import('../drizzle/schema');
        await conn.update(users)
          .set({ passwordHash: hash, mustChangePassword: 1 })
          .where(eq(users.id, input.userId));

        // Send notification to user with temp password
        const { createNotification } = await import('./routers/notifications');
        await createNotification({
          userId: input.userId,
          fromUserId: ctx.user.id,
          type: 'action',
          title: '🔑 كلمة سر مؤقتة',
          message: `كلمة السر المؤقتة: ${tempPassword} - يجب تغييرها عند الدخول`,
          link: '/'
        });

        await logAudit(ctx.user.id, 'SEND_TEMP_PASSWORD', 'user', input.userId, 'Admin sent temp password', ctx);

        return { success: true, message: 'تم إرسال كلمة سر مؤقتة للمستخدم' };
      }),

    // Get all pending password reset requests (admin)
    listResetRequests: adminProcedure
      .query(async () => {
        const conn = await db.getDb();
        if (!conn) return [];

        const { passwordResetRequests, users } = await import('../drizzle/schema');
        const result = await conn.select({
          id: passwordResetRequests.id,
          userId: passwordResetRequests.userId,
          status: passwordResetRequests.status,
          createdAt: passwordResetRequests.createdAt,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
        })
          .from(passwordResetRequests)
          .leftJoin(users, eq(passwordResetRequests.userId, users.id))
          .orderBy(desc(passwordResetRequests.createdAt));

        return result;
      }),

    // Get single request details
    getResetRequest: adminProcedure
      .input(z.object({ requestId: z.number() }))
      .query(async ({ input }) => {
        const conn = await db.getDb();
        if (!conn) return null;

        const { passwordResetRequests, users } = await import('../drizzle/schema');
        const result = await conn.select({
          id: passwordResetRequests.id,
          userId: passwordResetRequests.userId,
          status: passwordResetRequests.status,
          createdAt: passwordResetRequests.createdAt,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
        })
          .from(passwordResetRequests)
          .leftJoin(users, eq(passwordResetRequests.userId, users.id))
          .where(eq(passwordResetRequests.id, input.requestId))
          .limit(1);

        return result[0] || null;
      }),

    // Approve with reset link
    approveResetWithLink: adminProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const { passwordResetRequests } = await import('../drizzle/schema');

        // Get request
        const request = await conn.select()
          .from(passwordResetRequests)
          .where(eq(passwordResetRequests.id, input.requestId))
          .limit(1);

        if (!request[0]) throw new TRPCError({ code: 'NOT_FOUND' });
        if (request[0].status !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'هذا الطلب تمت معالجته مسبقاً' });
        }

        // Generate token
        const crypto = await import('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Update request
        await conn.update(passwordResetRequests)
          .set({
            status: 'approved_link',
            adminId: ctx.user.id,
            resetToken: token,
            tokenExpiresAt: expiresAt
          })
          .where(eq(passwordResetRequests.id, input.requestId));

        // Send notification to user
        const { createNotification } = await import('./routers/notifications');
        await createNotification({
          userId: request[0].userId,
          fromUserId: ctx.user.id,
          type: 'action',
          title: '🔗 رابط تعيين كلمة سر جديدة',
          message: 'تم الموافقة على طلبك. يرجى استخدام الرابط لتعيين كلمة سر جديدة.',
          link: `/reset-password/${token}`
        });

        await logAudit(ctx.user.id, 'APPROVE_RESET_WITH_LINK', 'passwordResetRequest', input.requestId, '', ctx);
        return { success: true };
      }),

    // Approve with temp password
    approveResetWithTempPassword: adminProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const { passwordResetRequests, users } = await import('../drizzle/schema');

        // Get request
        const request = await conn.select()
          .from(passwordResetRequests)
          .where(eq(passwordResetRequests.id, input.requestId))
          .limit(1);

        if (!request[0]) throw new TRPCError({ code: 'NOT_FOUND' });
        if (request[0].status !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'هذا الطلب تمت معالجته مسبقاً' });
        }

        // Generate temp password
        const crypto = await import('crypto');
        const tempPassword = crypto.randomBytes(4).toString('hex');
        const hash = crypto.createHash('sha256').update(tempPassword).digest('hex');

        // Set 24-hour expiry for temp password
        const tempPasswordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update user password, set mustChangePassword and expiry
        await conn.update(users)
          .set({
            passwordHash: hash,
            mustChangePassword: 1,
            tempPasswordExpiresAt: tempPasswordExpiresAt
          })
          .where(eq(users.id, request[0].userId));

        // Update request - store temp password for polling (user sees it in Forgot Password page)
        await conn.update(passwordResetRequests)
          .set({
            status: 'approved_temp',
            adminId: ctx.user.id,
            tempPassword: tempPassword // Stored for polling - user sees in Forgot Password page
          })
          .where(eq(passwordResetRequests.id, input.requestId));

        // NO notification sent - user sees password via polling on Forgot Password page

        await logAudit(ctx.user.id, 'APPROVE_RESET_WITH_TEMP', 'passwordResetRequest', input.requestId, '', ctx);
        return { success: true };
      }),

    // Reject reset request
    rejectResetRequest: adminProcedure
      .input(z.object({ requestId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const conn = await db.getDb();
        if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const { passwordResetRequests } = await import('../drizzle/schema');

        // Get request
        const request = await conn.select()
          .from(passwordResetRequests)
          .where(eq(passwordResetRequests.id, input.requestId))
          .limit(1);

        if (!request[0]) throw new TRPCError({ code: 'NOT_FOUND' });

        // Update request
        await conn.update(passwordResetRequests)
          .set({
            status: 'rejected',
            adminId: ctx.user.id,
            adminResponse: input.reason
          })
          .where(eq(passwordResetRequests.id, input.requestId));

        // Notify user
        const { createNotification } = await import('./routers/notifications');
        await createNotification({
          userId: request[0].userId,
          fromUserId: ctx.user.id,
          type: 'warning',
          title: '❌ تم رفض طلب إعادة تعيين كلمة السر',
          message: input.reason || 'تم رفض طلبك. يرجى التواصل مع الإدارة.',
        });

        await logAudit(ctx.user.id, 'REJECT_RESET_REQUEST', 'passwordResetRequest', input.requestId, '', ctx);
        return { success: true };
      }),

    // User checks their request status (polling)
    checkResetRequest: publicProcedure
      .input(z.object({ requestId: z.number() }))
      .query(async ({ input }) => {
        const conn = await db.getDb();
        if (!conn) return { status: 'not_found', tempPassword: null };

        const { passwordResetRequests } = await import('../drizzle/schema');
        const result = await conn.select()
          .from(passwordResetRequests)
          .where(eq(passwordResetRequests.id, input.requestId))
          .limit(1);

        if (!result[0]) return { status: 'not_found', tempPassword: null };

        const r = result[0];
        if (r.status === 'approved_temp') {
          // Return temp password and mark as completed
          await conn.update(passwordResetRequests)
            .set({ status: 'completed', completedAt: new Date() })
            .where(eq(passwordResetRequests.id, input.requestId));

          return { status: 'approved_temp', tempPassword: r.tempPassword };
        }

        if (r.status === 'approved_link') {
          return { status: 'approved_link', tempPassword: null, message: 'تم إرسال رابط لبريدك الإلكتروني' };
        }

        if (r.status === 'rejected') {
          return { status: 'rejected', tempPassword: null, message: r.adminResponse || 'تم رفض طلبك' };
        }

        return { status: r.status, tempPassword: null };
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
          'text/csv',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'video/mp4',
          'video/webm',
        ];
        const VIDEO_TYPES = ['video/mp4', 'video/webm'];
        const MAX_SIZE_DEFAULT = 10 * 1024 * 1024; // 10MB for images/docs/csv
        const MAX_SIZE_VIDEO = 100 * 1024 * 1024; // 100MB for videos
        const MAX_SIZE = VIDEO_TYPES.includes(input.mimeType) ? MAX_SIZE_VIDEO : MAX_SIZE_DEFAULT;

        if (!ALLOWED_TYPES.includes(input.mimeType)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'نوع الملف غير مسموح' });
        }
        const safeName = input.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const section =
          input.entityType.startsWith('form')
            ? 'forms'
            : input.entityType.startsWith('invoice')
              ? 'invoices'
              : input.entityType === 'setting' || input.entityType === 'important_file'
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
          const maxMB = MAX_SIZE / (1024 * 1024);
          throw new TRPCError({ code: 'BAD_REQUEST', message: `حجم الملف يتجاوز الحد المسموح (${maxMB}MB)` });
        }
        // Verify magic numbers to prevent MIME spoofing
        const head = buffer.subarray(0, 16);
        const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
        const isJpeg = head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
        const isWebp = head.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
        const isPdf = head.toString('ascii', 0, 4) === '%PDF';
        const isZip = head.toString('ascii', 0, 2) === 'PK'; // docx/xlsx
        const htmlStart = buffer.toString('utf8', 0, 100).toLowerCase().trim();
        const isHtml = htmlStart.includes('<!doctype') || htmlStart.includes('<html');
        const isText = input.mimeType === 'text/plain';
        const isCsv = input.mimeType === 'text/csv'; // CSV is plain text, no magic number
        // Video magic numbers
        const isMp4 = buffer.length >= 12 && (
          buffer.toString('ascii', 4, 8) === 'ftyp' || // Standard MP4
          buffer.toString('ascii', 4, 8) === 'moov' ||
          buffer.toString('ascii', 4, 8) === 'mdat'
        );
        const isWebm = head[0] === 0x1A && head[1] === 0x45 && head[2] === 0xDF && head[3] === 0xA3; // EBML header

        const mimeOk =
          (input.mimeType === 'image/png' && isPng) ||
          (input.mimeType === 'image/jpeg' && isJpeg) ||
          (input.mimeType === 'image/webp' && isWebp) ||
          (input.mimeType === 'application/pdf' && isPdf) ||
          (input.mimeType === 'text/html' && isHtml) ||
          (input.mimeType === 'text/plain' && isText) ||
          (input.mimeType === 'text/csv' && isCsv) ||
          (input.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && isZip) ||
          (input.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && isZip) ||
          (input.mimeType === 'video/mp4' && isMp4) ||
          (input.mimeType === 'video/webm' && isWebm);
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

        console.log("[files.upload] Creating attachment:", input.entityType, input.entityId, safeName);
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
        console.log("[files.upload] Attachment created successfully");
        await logAudit(ctx.user.id, 'UPLOAD_FILE', input.entityType, input.entityId, `Uploaded file: ${input.fileName}`, ctx);

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
        await ensurePerm(ctx, 'settings'); // Backend Guard for important files
        await db.deleteAttachment(input.id);
        await logAudit(ctx.user.id, 'DELETE_FILE', 'attachment', input.id, undefined, ctx);
        return { success: true };
      }),

    // List all important files (for Settings page)
    listImportant: protectedProcedure
      .query(async ({ ctx }) => {
        await ensurePerm(ctx, 'settings'); // Backend Guard
        return await db.getImportantFiles();
      })
  }),

  // ============= HUMAN RESOURCES =============
  hr: hrRouter,

  // ============= ACCOUNTING =============
  accounting: accountingRouter,
  reports: reportsRouter
  ,
  tasks: tasksRouter,
  approvals: approvalsRouter,
  notifications: notificationsRouter,

  // ============= AI ASSISTANT =============
  ai: router({
    // Save Gemini page settings for current user
    saveGeminiPage: protectedProcedure
      .input(z.object({
        pageUrl: z.string().url(),
        apiKey: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Hash API key for security if provided
        let apiKeyHash: string | null = null;
        if (input.apiKey) {
          const crypto = await import('crypto');
          apiKeyHash = crypto.createHash('sha256').update(input.apiKey).digest('hex');
        }

        await db.saveGeminiPage(ctx.user.id, input.pageUrl, apiKeyHash);
        await logAudit(ctx.user.id, 'SAVE_GEMINI_PAGE', 'aiGeminiPage', undefined, `Saved Gemini page: ${input.pageUrl}`, ctx);
        return { success: true };
      }),

    // Get Gemini page settings for current user
    getGeminiPage: protectedProcedure
      .query(async ({ ctx }) => {
        const page = await db.getGeminiPage(ctx.user.id);
        if (!page) return null;
        return {
          id: page.id,
          pageUrl: page.pageUrl,
          isHidden: Boolean(page.isHidden),
          hasApiKey: Boolean(page.apiKeyHash),
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        };
      }),

    // Hide Gemini page for current user
    hideGeminiPage: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.hideGeminiPage(ctx.user.id);
        await logAudit(ctx.user.id, 'HIDE_GEMINI_PAGE', 'aiGeminiPage', undefined, 'Hidden Gemini page', ctx);
        return { success: true };
      }),

    // Show (unhide) Gemini page for current user
    showGeminiPage: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.showGeminiPage(ctx.user.id);
        await logAudit(ctx.user.id, 'SHOW_GEMINI_PAGE', 'aiGeminiPage', undefined, 'Shown Gemini page', ctx);
        return { success: true };
      }),
  }),

  // ============= GENERAL REPORTS =============
  generalReports: generalReportsRouter,
});

export type AppRouter = typeof appRouter;



