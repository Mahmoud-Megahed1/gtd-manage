import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { userPermissions } from "../../drizzle/schema";
import { logAudit } from "../_core/audit";
import { eq } from "drizzle-orm";

// Permission levels for granular access control
export type PermissionLevel = 'full' | 'own' | 'readonly' | 'none';

// Permission cache stored in request context to avoid redundant DB queries
export interface PermissionCache {
    userId: number;
    permissionsRecord: Record<string, boolean>;
    loadedAt: number;
}

// Get or load permissions from cache
export async function getPermissionsFromCache(ctx: any): Promise<Record<string, boolean>> {
    // Check if already cached in context
    if (ctx._permCache && ctx._permCache.userId === ctx.user.id) {
        return ctx._permCache.permissionsRecord;
    }

    // Load from DB and cache
    const db = await getDb();
    if (!db) return {};

    const perms = await db.select().from(userPermissions).where(eq(userPermissions.userId, ctx.user.id)).limit(1);
    const record = perms[0]?.permissionsJson ? JSON.parse(perms[0].permissionsJson) : {};

    ctx._permCache = {
        userId: ctx.user.id,
        permissionsRecord: record,
        loadedAt: Date.now()
    };

    return record;
}

export async function ensurePerm(ctx: any, sectionKey: string) {
    // SECURITY: Permission checks apply in ALL environments
    const role = ctx.user.role;

    // 1. Check Custom Override in DB (using cache)
    const record = await getPermissionsFromCache(ctx);

    // Check for explicit ALLOW or DENY
    // Key format: "resource" (e.g. 'accounting') or "resource.action"

    // If we have an explicit override for this section (boolean)
    if (record.hasOwnProperty(sectionKey)) {
        if (record[sectionKey]) {
            return; // Explicitly ALLOWED
        } else {
            await logAudit(ctx.user.id, 'ACCESS_DENIED', 'section', undefined, `User permission override denied access to "${sectionKey}"`, ctx);
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Section access denied' }); // Explicitly DENIED
        }
    }

    // Also check "resource.view" as a proxy for section access if "resource" key is missing
    const viewKey = `${sectionKey}.view`;
    if (record.hasOwnProperty(viewKey)) {
        if (record[viewKey]) {
            return; // Explicitly ALLOWED via view action
        }
    }

    // 2. Fallback to Role Defaults
    const defaultAllowedByRole: Record<string, string[]> = {
        // === الإدارة العليا ===
        admin: ['*'],
        department_manager: ['projects', 'tasks', 'hr', 'reports', 'dashboard', 'clients', 'invoices', 'forms', 'generalReports'],

        // === إدارة المشاريع ===
        project_manager: ['projects', 'tasks', 'rfis', 'submittals', 'drawings', 'projectReports', 'dashboard', 'clients', 'forms', 'generalReports', 'accounting', 'reports'],
        project_coordinator: ['projects', 'tasks', 'dashboard', 'clients', 'forms', 'rfis', 'submittals', 'drawings', 'generalReports', 'approval_requests'],

        // === المهندسين والفنيين ===
        architect: ['projects', 'drawings', 'rfis', 'submittals', 'dashboard', 'hr'],
        interior_designer: ['projects', 'drawings', 'dashboard', 'hr'],
        site_engineer: ['projects', 'tasks', 'rfis', 'submittals', 'drawings', 'dashboard', 'hr'],
        planning_engineer: ['projects', 'tasks', 'projectReports', 'dashboard', 'generalReports', 'accounting', 'hr'],
        designer: ['projects', 'tasks', 'dashboard', 'hr'],
        technician: ['tasks', 'dashboard', 'hr'],

        // === الإدارة المالية ===
        finance_manager: ['accounting', 'reports', 'dashboard', 'invoices', 'forms', 'generalReports', 'approval_requests', 'hr'],
        accountant: ['accounting', 'dashboard', 'sales', 'purchases', 'expenses', 'invoices', 'reports', 'generalReports', 'approval_requests', 'hr'],

        // === المبيعات ===
        sales_manager: ['sales', 'clients', 'invoices', 'dashboard', 'forms', 'generalReports', 'hr'],

        // === الموارد البشرية ===
        hr_manager: ['hr', 'dashboard', 'users'],
        admin_assistant: ['hr', 'dashboard', 'forms', 'clients'],

        // === المشتريات والمخازن ===
        procurement_officer: ['procurement', 'purchases', 'boq', 'dashboard', 'generalReports', 'hr'],
        storekeeper: ['procurement', 'dashboard', 'hr'],
        qa_qc: ['qaqc', 'submittals', 'rfis', 'dashboard', 'generalReports', 'hr'],
        document_controller: ['projects', 'forms', 'drawings', 'submittals', 'dashboard', 'hr'],

        // === مشاهد ===
        viewer: ['hr', 'dashboard'],
    };

    const allowedList = defaultAllowedByRole[role] || [];
    const roleAllowed = allowedList.includes('*') || allowedList.includes(sectionKey);

    if (!roleAllowed) {
        await logAudit(ctx.user.id, 'ACCESS_DENIED', 'section', undefined, `Role "${role}" role attempted to access "${sectionKey}" - DENIED`, ctx);
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Section access denied' });
    }
}

// Helper to check if user has a specific modifier enabled (default or overridden)
// Uses caching to avoid redundant DB queries
export async function hasModifier(userId: number, role: string, resource: string, modifier: string, ctx?: any): Promise<boolean> {
    // 1. Check Custom Override in DB (use cache if ctx available)
    let record: Record<string, boolean> = {};

    if (ctx && ctx._permCache && ctx._permCache.userId === userId) {
        record = ctx._permCache.permissionsRecord;
    } else {
        const db = await getDb();
        if (!db) return false;

        // If context not cached, we might need to fetch manually.
        // Ideally we should use getPermissionsFromCache(ctx) if ctx is provided.
        // But specific userId check prevents盲ly using ctx if userId != ctx.user.id
        // Assuming normally userId == ctx.user.id
        if (ctx && ctx.user.id === userId) {
            record = await getPermissionsFromCache(ctx);
        } else {
            const perms = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId)).limit(1);
            record = perms[0]?.permissionsJson ? JSON.parse(perms[0].permissionsJson) : {};
        }
    }

    const key = `${resource}.${modifier}`;

    if (record.hasOwnProperty(key)) {
        return !!record[key];
    }

    // 2. Check Role Defaults (Hardcoded for now to match frontend DEFAULT_MODIFIERS)
    // المهندسين والفنيين -> onlyAssigned (المشاريع والمهام المُسندة فقط)
    if (modifier === 'onlyAssigned') {
        if (['architect', 'interior_designer', 'designer', 'site_engineer', 'project_coordinator', 'technician', 'planning_engineer'].includes(role) &&
            ['projects', 'tasks'].includes(resource)) {
            return true;
        }
    }

    // canViewFinancials: الأدوار التي ترى المعلومات المالية في المشاريع
    if (modifier === 'canViewFinancials') {
        if (['admin', 'finance_manager', 'project_manager', 'department_manager', 'accountant', 'procurement_officer'].includes(role)) return true;
        return false;
    }

    // autoApprove: فقط admin و finance_manager يُنشئون مباشرة
    // المحاسب ومسؤول المشتريات يرفعون طلبات للاعتماد
    if (modifier === 'autoApprove') {
        if (['admin', 'finance_manager'].includes(role)) return true;
        return false;
    }

    // 3. Fallback to Detailed Defaults for standard actions
    if (['view', 'create', 'edit', 'delete', 'approve', 'submit', 'viewFinancials'].includes(modifier)) {
        const detailed = getDetailedPermissions(role);
        const res = resource as keyof typeof detailed;
        if (detailed[res]) {
            const action = modifier as keyof SubPermissions;
            if (detailed[res][action] !== undefined) {
                return detailed[res][action];
            }
        }
    }

    return false;
}

export type SubPermissions = {
    view: boolean;
    viewOwn: boolean;
    viewFinancials: boolean; // Can see budget/cost/profit?
    create: boolean;
    edit: boolean;
    delete: boolean;
    approve: boolean;
    submit: boolean; // For approval requests (Accountant etc.)
};

export type DetailedPermissions = {
    hr: SubPermissions;
    projects: SubPermissions;
    tasks: SubPermissions;
    accounting: SubPermissions;
    clients: SubPermissions;
    forms: SubPermissions;
    invoices: SubPermissions;
    reports: SubPermissions;
    users: SubPermissions;
};

export function getPermissionLevel(role: string, section: string): PermissionLevel {
    // Admin has full access everywhere
    if (role === 'admin') return 'full';

    // Define permission matrix: role -> section -> level
    const permissionMatrix: Record<string, Record<string, PermissionLevel>> = {
        // HR Manager - full access to HR
        hr_manager: { hr: 'full', dashboard: 'full', users: 'full' },
        // Finance roles
        finance_manager: { accounting: 'full', reports: 'full', dashboard: 'full', hr: 'own', projects: 'readonly', invoices: 'full' },
        accountant: { accounting: 'readonly', reports: 'readonly', dashboard: 'readonly', projects: 'readonly', hr: 'own', invoices: 'full' },
        // Project roles
        project_manager: {
            projects: 'full',
            tasks: 'full',
            dashboard: 'full',
            hr: 'own',
            forms: 'full',
            accounting: 'readonly',
            clients: 'readonly'
        },
        department_manager: { projects: 'full', tasks: 'full', dashboard: 'full', hr: 'own', forms: 'full', invoices: 'readonly', clients: 'readonly', reports: 'readonly' },
        project_coordinator: { projects: 'own', tasks: 'full', dashboard: 'readonly', hr: 'own', forms: 'readonly' },
        site_engineer: { projects: 'own', tasks: 'own', dashboard: 'readonly', hr: 'own' },
        planning_engineer: { projects: 'own', tasks: 'own', dashboard: 'readonly', hr: 'own', reports: 'readonly' },
        architect: { projects: 'own', tasks: 'own', dashboard: 'readonly', hr: 'own' },
        interior_designer: { projects: 'own', tasks: 'own', dashboard: 'readonly', hr: 'own' },
        designer: { projects: 'own', tasks: 'own', hr: 'own', dashboard: 'readonly' },
        technician: { tasks: 'own', hr: 'own', dashboard: 'readonly' },
        // Regular employees - can only see their own data in HR
        employee: { hr: 'own', dashboard: 'readonly' },
        // Other roles
        sales_manager: { clients: 'full', invoices: 'full', dashboard: 'full', hr: 'own', projects: 'readonly', forms: 'full' },
        admin_assistant: { clients: 'readonly', forms: 'full', dashboard: 'readonly', hr: 'own' },
        procurement_officer: { procurement: 'full', purchases: 'full', dashboard: 'readonly', hr: 'own', accounting: 'readonly' },
        document_controller: { documents: 'full', attachments: 'full', dashboard: 'readonly', hr: 'own', projects: 'readonly', forms: 'readonly' },
        qa_qc: { qaqc: 'full', dashboard: 'readonly', hr: 'own', projects: 'readonly' },
        storekeeper: { procurement: 'readonly', dashboard: 'readonly', hr: 'own' },
        viewer: { dashboard: 'readonly', hr: 'own' },
    };

    const rolePerms = permissionMatrix[role];
    if (!rolePerms) return 'none';

    return rolePerms[section] || 'none';
}

export function getDetailedPermissions(role: string): DetailedPermissions {
    const fullPerms: SubPermissions = { view: true, viewOwn: true, viewFinancials: true, create: true, edit: true, delete: true, approve: true, submit: true };
    const ownPerms: SubPermissions = { view: false, viewOwn: true, viewFinancials: false, create: false, edit: false, delete: false, approve: false, submit: true };
    const readonlyPerms: SubPermissions = { view: true, viewOwn: true, viewFinancials: false, create: false, edit: false, delete: false, approve: false, submit: false };
    const nonePerms: SubPermissions = { view: false, viewOwn: false, viewFinancials: false, create: false, edit: false, delete: false, approve: false, submit: false };

    if (role === 'admin') {
        return { hr: fullPerms, projects: fullPerms, tasks: fullPerms, accounting: fullPerms, clients: fullPerms, forms: fullPerms, invoices: fullPerms, reports: fullPerms, users: fullPerms };
    }

    const rolePermsMap: Record<string, DetailedPermissions> = {
        hr_manager: {
            hr: fullPerms,
            projects: readonlyPerms,
            tasks: readonlyPerms,
            accounting: nonePerms,
            clients: readonlyPerms,
            forms: readonlyPerms,
            invoices: nonePerms,
            reports: nonePerms,
            users: fullPerms,
        },
        finance_manager: {
            hr: ownPerms,
            projects: { ...readonlyPerms, viewFinancials: true },
            tasks: nonePerms,
            accounting: fullPerms,
            clients: readonlyPerms,
            forms: nonePerms,
            invoices: fullPerms,
            reports: fullPerms,
            users: nonePerms,
        },
        accountant: {
            hr: ownPerms,
            projects: readonlyPerms,
            tasks: nonePerms,
            accounting: { ...readonlyPerms, submit: true },
            clients: readonlyPerms,
            forms: nonePerms,
            invoices: { ...readonlyPerms, create: true },
            reports: readonlyPerms,
            users: nonePerms,
        },
        department_manager: {
            hr: ownPerms,
            projects: { ...fullPerms, delete: false },
            tasks: { ...fullPerms, delete: false },
            accounting: nonePerms,
            clients: readonlyPerms,
            forms: { ...fullPerms, delete: false },
            invoices: readonlyPerms,
            reports: { ...readonlyPerms, create: true },
            users: nonePerms,
        },
        project_manager: {
            hr: ownPerms,
            projects: { ...fullPerms, delete: false },
            tasks: { ...fullPerms, delete: false },
            accounting: { ...readonlyPerms, viewFinancials: true },
            clients: readonlyPerms,
            forms: { ...fullPerms, delete: false },
            invoices: nonePerms,
            reports: { ...readonlyPerms, create: true },
            users: nonePerms,
        },
        project_coordinator: {
            hr: ownPerms,
            projects: { ...readonlyPerms, edit: true },
            tasks: { ...ownPerms, edit: true, create: true },
            accounting: nonePerms,
            clients: { ...readonlyPerms, view: true },
            forms: { ...readonlyPerms, view: true },
            invoices: nonePerms,
            reports: nonePerms,
            users: nonePerms,
        },
        architect: {
            hr: { ...ownPerms, submit: true },
            projects: { ...ownPerms, view: false, viewOwn: true },
            tasks: { ...ownPerms, edit: true },
            accounting: nonePerms,
            clients: nonePerms,
            forms: nonePerms,
            invoices: nonePerms,
            reports: nonePerms,
            users: nonePerms,
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
            users: nonePerms,
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
            users: nonePerms,
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
            users: nonePerms,
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
            users: nonePerms,
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
            users: nonePerms,
        },
        sales_manager: {
            hr: ownPerms,
            projects: readonlyPerms,
            tasks: nonePerms,
            accounting: { ...readonlyPerms, viewFinancials: true },
            clients: fullPerms,
            forms: fullPerms,
            invoices: fullPerms,
            reports: { ...readonlyPerms, create: true },
            users: nonePerms,
        },
        admin_assistant: {
            hr: ownPerms,
            projects: readonlyPerms,
            tasks: readonlyPerms,
            accounting: nonePerms,
            clients: { ...readonlyPerms, create: true },
            forms: fullPerms,
            invoices: nonePerms,
            reports: nonePerms,
            users: nonePerms,
        },
        procurement_officer: {
            hr: ownPerms,
            projects: readonlyPerms,
            tasks: nonePerms,
            accounting: readonlyPerms,
            clients: nonePerms,
            forms: nonePerms,
            invoices: nonePerms,
            reports: readonlyPerms,
            users: nonePerms,
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
            users: nonePerms,
        },
        qa_qc: {
            hr: ownPerms,
            projects: readonlyPerms,
            tasks: { ...readonlyPerms, edit: true },
            accounting: nonePerms,
            clients: nonePerms,
            forms: nonePerms,
            invoices: nonePerms,
            reports: readonlyPerms,
            users: nonePerms,
        },
        document_controller: {
            hr: ownPerms,
            projects: readonlyPerms,
            tasks: readonlyPerms,
            accounting: nonePerms,
            clients: readonlyPerms,
            forms: fullPerms,
            invoices: nonePerms,
            reports: readonlyPerms,
            users: nonePerms,
        },
        employee: {
            hr: { ...ownPerms, submit: true },
            projects: nonePerms,
            tasks: nonePerms,
            accounting: nonePerms,
            clients: nonePerms,
            forms: nonePerms,
            invoices: nonePerms,
            reports: nonePerms,
            users: nonePerms,
        },
        viewer: {
            hr: ownPerms,
            projects: readonlyPerms,
            tasks: readonlyPerms,
            accounting: nonePerms,
            clients: nonePerms,
            forms: nonePerms,
            invoices: nonePerms,
            reports: nonePerms,
            users: nonePerms,
        }
    };

    return rolePermsMap[role] || { hr: nonePerms, projects: nonePerms, tasks: nonePerms, accounting: nonePerms, clients: nonePerms, forms: nonePerms, invoices: nonePerms, reports: nonePerms };
}
