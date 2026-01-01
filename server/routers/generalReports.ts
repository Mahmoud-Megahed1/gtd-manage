/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { and, gte, lte, eq, sql, count, sum, ne, isNull } from "drizzle-orm";
import {
    clients, projects, invoices, expenses, installments, purchases, savedReports,
    forms, employees, users, sales
} from "../../drizzle/schema";
import * as demo from "../_core/demoStore";

// ============= PERMISSION MATRIX =============
type ReportSection = 'clients' | 'projects' | 'tasks' | 'invoices' | 'accounting' | 'hr' | 'forms' | 'overview' | 'saved_reports';

interface ReportPermission {
    canView: boolean;
    canViewFinancials: boolean;
    onlyAssigned: boolean;
    onlyOwn: boolean;
}

function getReportPermission(role: string, section: ReportSection): ReportPermission {
    // Admin has full access
    if (role === 'admin') {
        return { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false };
    }

    const matrix: Record<string, Record<ReportSection, ReportPermission>> = {
        finance_manager: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
        },
        accountant: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
        },
        project_manager: {
            clients: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
        },
        department_manager: {
            clients: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
        },
        designer: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            tasks: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
        architect: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            tasks: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
        site_engineer: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            tasks: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
        interior_designer: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            tasks: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
        planning_engineer: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            tasks: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
        hr_manager: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
        sales_manager: {
            clients: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
        },

        // منسق مشاريع - يشوف المشاريع والمهام المسندة إليه
        project_coordinator: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            tasks: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
        // مساعد إداري - صلاحيات محدودة للعملاء والاستمارات
        admin_assistant: {
            clients: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
        // مسؤول مشتريات - يشوف المحاسبة والمشتريات
        procurement_manager: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: true, canViewFinancials: true, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
        },
        // أمين مخازن - صلاحيات محدودة
        warehouse_manager: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
        // مسؤول جودة - يشوف المشاريع والمهام للمراقبة
        quality_manager: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
        },
        // فني - مثل المصمم، يشوف المسند إليه فقط
        technician: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            tasks: { canView: true, canViewFinancials: false, onlyAssigned: true, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
        // أخرى / موظف عادي - بياناته فقط في HR
        other: {
            clients: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            projects: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            tasks: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            invoices: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            accounting: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            hr: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
            forms: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            overview: { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false },
            saved_reports: { canView: true, canViewFinancials: false, onlyAssigned: false, onlyOwn: true },
        },
    };

    const rolePerms = matrix[role];
    if (!rolePerms) {
        return { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false };
    }
    return rolePerms[section] || { canView: false, canViewFinancials: false, onlyAssigned: false, onlyOwn: false };
}

function checkReportPermission(role: string, section: ReportSection): ReportPermission {
    const perm = getReportPermission(role, section);
    if (!perm.canView) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `ليس لديك صلاحية الوصول لتقرير ${section}` });
    }
    return perm;
}

// Date filter input schema
const dateFilterSchema = z.object({
    from: z.date().optional(),
    to: z.date().optional(),
});

// ============= GENERAL REPORTS ROUTER =============
export const generalReportsRouter = router({
    // Get available report sections for current user
    getAvailableSections: protectedProcedure
        .query(({ ctx }) => {
            const sections: ReportSection[] = ['clients', 'projects', 'tasks', 'invoices', 'accounting', 'hr', 'forms', 'overview', 'saved_reports'];
            const available: { key: ReportSection; label: string; canViewFinancials: boolean }[] = [];

            const labels: Record<ReportSection, string> = {
                clients: 'العملاء',
                projects: 'المشاريع',
                tasks: 'المهام',
                invoices: 'الفواتير',
                accounting: 'المحاسبة',
                hr: 'شؤون الموظفين',
                forms: 'الاستمارات',
                overview: 'نظرة عامة',
                saved_reports: 'الأرشيف',
            };

            for (const section of sections) {
                const perm = getReportPermission(ctx.user.role, section);
                if (perm.canView) {
                    available.push({ key: section, label: labels[section], canViewFinancials: perm.canViewFinancials });
                }
            }

            return available;
        }),

    // 1. CLIENTS REPORT
    clientsReport: protectedProcedure
        .input(dateFilterSchema.extend({
            status: z.string().optional(),
        }))
        .query(async ({ input, ctx }) => {
            checkReportPermission(ctx.user.role, 'clients');

            const conn = await db.getDb();
            if (!conn) {
                const allClients = demo.list("clients");
                return {
                    totalClients: allClients.length,
                    newClientsThisMonth: 0,
                    clientsByCity: {} as Record<string, number>,
                    recentClients: allClients.slice(0, 10),
                };
            }

            const from = input.from ?? new Date(0);
            const to = input.to ?? new Date();

            // Total clients
            const totalResult = await conn.select({ count: count() }).from(clients);
            const totalClients = totalResult[0]?.count || 0;

            // New clients in period
            const newClientsResult = await conn.select({ count: count() })
                .from(clients)
                .where(and(gte(clients.createdAt, from), lte(clients.createdAt, to)));
            const newClients = newClientsResult[0]?.count || 0;

            // Clients by city
            const cityResult = await conn.select({
                city: clients.city,
                count: count(),
            }).from(clients).groupBy(clients.city);

            const clientsByCity: Record<string, number> = {};
            cityResult.forEach(r => {
                clientsByCity[r.city || 'غير محدد'] = r.count;
            });

            // Recent clients
            const recentClients = await conn.select()
                .from(clients)
                .orderBy(sql`${clients.createdAt} DESC`)
                .limit(10);

            return {
                totalClients,
                newClients,
                clientsByCity,
                recentClients,
            };
        }),

    // 2. PROJECTS REPORT
    projectsReport: protectedProcedure
        .input(dateFilterSchema.extend({
            status: z.enum(['design', 'execution', 'delivery', 'completed', 'cancelled']).optional(),
            clientId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const perm = checkReportPermission(ctx.user.role, 'projects');

            const conn = await db.getDb();
            if (!conn) {
                let allProjects = demo.list("projects");
                if (perm.onlyAssigned) {
                    allProjects = allProjects.filter((p: any) => p.assignedTo === ctx.user.id);
                }
                return {
                    totalProjects: allProjects.length,
                    projectsByStatus: {} as Record<string, number>,
                    totalBudget: perm.canViewFinancials ? allProjects.reduce((s: number, p: any) => s + (p.budget || 0), 0) : null,
                    recentProjects: allProjects.slice(0, 10).map((p: any) => perm.canViewFinancials ? p : { ...p, budget: undefined }),
                };
            }

            const conditions: any[] = [];
            if (input.from) conditions.push(gte(projects.createdAt, input.from));
            if (input.to) conditions.push(lte(projects.createdAt, input.to));
            if (input.status) conditions.push(eq(projects.status, input.status as any));
            if (input.clientId) conditions.push(eq(projects.clientId, input.clientId));
            if (perm.onlyAssigned) conditions.push(eq(projects.assignedTo, ctx.user.id));

            // Total projects
            const totalResult = await conn.select({ count: count() })
                .from(projects)
                .where(conditions.length ? and(...conditions) : undefined);
            const totalProjects = totalResult[0]?.count || 0;

            // Projects by status
            const statusResult = await conn.select({
                status: projects.status,
                count: count(),
            }).from(projects)
                .where(conditions.length ? and(...conditions) : undefined)
                .groupBy(projects.status);

            const projectsByStatus: Record<string, number> = {};
            statusResult.forEach(r => {
                projectsByStatus[r.status || 'غير محدد'] = r.count;
            });

            // Total budget (only if allowed)
            let totalBudget: number | null = null;
            if (perm.canViewFinancials) {
                const budgetResult = await conn.select({ total: sum(projects.budget) })
                    .from(projects)
                    .where(conditions.length ? and(...conditions) : undefined);
                totalBudget = Number(budgetResult[0]?.total || 0);
            }

            // Recent projects
            let recentProjects = await conn.select()
                .from(projects)
                .where(conditions.length ? and(...conditions) : undefined)
                .orderBy(sql`${projects.createdAt} DESC`)
                .limit(10);

            // Hide budget if not allowed
            if (!perm.canViewFinancials) {
                recentProjects = recentProjects.map(p => ({ ...p, budget: null }));
            }

            return {
                totalProjects,
                projectsByStatus,
                totalBudget,
                recentProjects,
            };
        }),

    // 3. TASKS REPORT
    tasksReport: protectedProcedure
        .input(dateFilterSchema.extend({
            status: z.enum(['planned', 'in_progress', 'done', 'cancelled']).optional(),
            projectId: z.number().optional(),
            assigneeId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const perm = checkReportPermission(ctx.user.role, 'tasks');

            const conn = await db.getDb();
            const { projectTasks } = await import("../../drizzle/schema");

            if (!conn) {
                let allTasks = demo.list("projectTasks");
                if (perm.onlyAssigned) {
                    allTasks = allTasks.filter((t: any) => t.assignedTo === ctx.user.id);
                }
                const tasksByStatus: Record<string, number> = {};
                allTasks.forEach((t: any) => {
                    const st = t.status || 'planned';
                    tasksByStatus[st] = (tasksByStatus[st] || 0) + 1;
                });
                return {
                    totalTasks: allTasks.length,
                    tasksByStatus,
                    completedCount: allTasks.filter((t: any) => t.status === 'completed').length,
                    overdueCount: 0,
                    recentTasks: allTasks.slice(0, 10),
                };
            }

            const conditions: any[] = [];
            if (input.from) conditions.push(gte(projectTasks.createdAt, input.from));
            if (input.to) conditions.push(lte(projectTasks.createdAt, input.to));
            if (input.status) conditions.push(sql`${projectTasks.status} = ${input.status}`);
            if (input.projectId) conditions.push(eq(projectTasks.projectId, input.projectId));
            if (input.assigneeId) conditions.push(eq(projectTasks.assignedTo, input.assigneeId));
            if (perm.onlyAssigned) conditions.push(eq(projectTasks.assignedTo, ctx.user.id));

            // Total tasks
            const totalResult = await conn.select({ count: count() })
                .from(projectTasks)
                .where(conditions.length ? and(...conditions) : undefined);
            const totalTasks = totalResult[0]?.count || 0;

            // Tasks by status
            const statusResult = await conn.select({
                status: projectTasks.status,
                count: count(),
            }).from(projectTasks)
                .where(conditions.length ? and(...conditions) : undefined)
                .groupBy(projectTasks.status);

            const tasksByStatus: Record<string, number> = {};
            statusResult.forEach(r => {
                tasksByStatus[r.status || 'planned'] = r.count;
            });

            // Recent tasks
            const recentTasks = await conn.select()
                .from(projectTasks)
                .where(conditions.length ? and(...conditions) : undefined)
                .orderBy(sql`${projectTasks.createdAt} DESC`)
                .limit(10);

            return {
                totalTasks,
                tasksByStatus,
                completedCount: tasksByStatus['done'] || 0,
                overdueCount: 0, // TODO: Calculate based on endDate
                recentTasks,
            };
        }),

    // 4. INVOICES REPORT
    invoicesReport: protectedProcedure
        .input(dateFilterSchema.extend({
            status: z.enum(['draft', 'sent', 'paid', 'cancelled']).optional(),
            type: z.enum(['invoice', 'quote']).optional(),
            clientId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            checkReportPermission(ctx.user.role, 'invoices');

            const conn = await db.getDb();
            if (!conn) {
                const allInvoices = demo.list("invoices");
                return {
                    totalInvoices: allInvoices.length,
                    invoicesByStatus: {} as Record<string, number>,
                    totalAmount: allInvoices.reduce((s: number, i: any) => s + (i.total || 0), 0),
                    paidAmount: allInvoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.total || 0), 0),
                    recentInvoices: allInvoices.slice(0, 10),
                };
            }

            const conditions: any[] = [];
            if (input.from) conditions.push(gte(invoices.issueDate, input.from));
            if (input.to) conditions.push(lte(invoices.issueDate, input.to));
            if (input.status) conditions.push(eq(invoices.status, input.status));
            if (input.type) conditions.push(eq(invoices.type, input.type));
            if (input.clientId) conditions.push(eq(invoices.clientId, input.clientId));

            // Total invoices
            const totalResult = await conn.select({ count: count() })
                .from(invoices)
                .where(conditions.length ? and(...conditions) : undefined);
            const totalInvoices = totalResult[0]?.count || 0;

            // Invoices by status
            const statusResult = await conn.select({
                status: invoices.status,
                count: count(),
                total: sum(invoices.total),
            }).from(invoices)
                .where(conditions.length ? and(...conditions) : undefined)
                .groupBy(invoices.status);

            // Calculate paid amount = sum of invoices with status 'paid'
            // Filter by type='invoice' to exclude quotes
            const paidConditions = [
                eq(invoices.status, 'paid'),
                eq(invoices.type, 'invoice')
            ];
            if (input.from) paidConditions.push(gte(invoices.issueDate, input.from));
            if (input.to) paidConditions.push(lte(invoices.issueDate, input.to));
            if (input.clientId) paidConditions.push(eq(invoices.clientId, input.clientId));

            const paidResult = await conn.select({ paid: sum(invoices.total) })
                .from(invoices)
                .where(and(...paidConditions));

            const paidAmount = Number(paidResult[0]?.paid || 0);

            const invoicesByStatus: Record<string, { count: number; total: number }> = {};
            let totalAmount = 0;

            statusResult.forEach(r => {
                const st = r.status || 'draft';
                invoicesByStatus[st] = { count: r.count, total: Number(r.total || 0) };
                totalAmount += Number(r.total || 0);
            });

            // Recent invoices
            const recentInvoices = await conn.select()
                .from(invoices)
                .where(conditions.length ? and(...conditions) : undefined)
                .orderBy(sql`${invoices.issueDate} DESC`)
                .limit(10);

            return {
                totalInvoices,
                invoicesByStatus,
                totalAmount,
                paidAmount,
                pendingAmount: totalAmount - paidAmount,
                recentInvoices,
            };
        }),

    // 5. ACCOUNTING REPORT
    accountingReport: protectedProcedure
        .input(dateFilterSchema.extend({
            projectId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            checkReportPermission(ctx.user.role, 'accounting');

            const conn = await db.getDb();
            if (!conn) {
                const allExpenses = demo.list("expenses");
                const allInstallments = demo.list("installments");
                return {
                    totalExpenses: allExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0),
                    totalInstallments: allInstallments.reduce((s: number, i: any) => s + (i.amount || 0), 0),
                    paidInstallments: allInstallments.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0),
                    expensesByCategory: {} as Record<string, number>,
                    netProfit: 0,
                };
            }

            const from = input.from ?? new Date(0);
            const to = input.to ?? new Date();

            // Expenses (Operating)
            const expConditions = [gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)];
            if (input.projectId) expConditions.push(eq(expenses.projectId, input.projectId));

            const expensesResult = await conn.select({ total: sum(expenses.amount) })
                .from(expenses)
                .where(and(...expConditions));
            const totalOperatingExpenses = Number(expensesResult[0]?.total || 0);

            // Purchases
            const purchConditions = [gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)];
            if (input.projectId) purchConditions.push(eq(purchases.projectId, input.projectId));

            const purchasesResult = await conn.select({ total: sum(purchases.amount) })
                .from(purchases)
                .where(and(...purchConditions));
            const totalPurchases = Number(purchasesResult[0]?.total || 0);

            // Total Expenses (Operating + Purchases)
            const totalExpenses = totalOperatingExpenses + totalPurchases;

            // Expenses by category
            const categoryResult = await conn.select({
                category: expenses.category,
                total: sum(expenses.amount),
            }).from(expenses)
                .where(and(...expConditions))
                .groupBy(expenses.category);

            const expensesByCategory: Record<string, number> = {};
            categoryResult.forEach(r => {
                expensesByCategory[r.category || 'أخرى'] = Number(r.total || 0);
            });
            // Add purchases as a category? Or separate? For now, let's keep expensesByCategory for operating expenses only or add a generic 'Purchases' category.
            // Let's add 'مشتريات' category if there are purchases
            if (totalPurchases > 0) {
                expensesByCategory['مشتريات'] = totalPurchases;
            }

            // 1. Installments (mirroring accounting.ts)
            const instConditions = [gte(installments.dueDate, from), lte(installments.dueDate, to)];
            if (input.projectId) instConditions.push(eq(installments.projectId, input.projectId));

            const instResult = await conn.select({
                total: sum(installments.amount),
                paid: sql<number>`SUM(CASE WHEN ${installments.status} = 'paid' THEN ${installments.amount} ELSE 0 END)`,
            }).from(installments)
                .where(and(...instConditions));

            const instTotal = Number(instResult[0]?.total || 0);
            const instPaid = Number(instResult[0]?.paid || 0);

            // 2. Invoices (Mirroring accounting.ts logic + Date filter)
            const invConditions = [
                gte(invoices.issueDate, from),
                lte(invoices.issueDate, to),
                eq(invoices.type, 'invoice'),
                ne(invoices.status, 'cancelled')
            ];
            if (input.projectId) invConditions.push(eq(invoices.projectId, input.projectId));

            const invResult = await conn.select({
                total: sum(invoices.total),
                paid: sql<number>`SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.total} ELSE 0 END)`
            }).from(invoices)
                .where(and(...invConditions));

            const invoicesTotal = Number(invResult[0]?.total || 0);
            const invoicesPaid = Number(invResult[0]?.paid || 0);

            // 3. Manual Sales (Completed ONLY, not linked to invoices)
            const salesConditions = [
                gte(sales.saleDate, from),
                lte(sales.saleDate, to),
                eq(sales.status, 'completed'),
                isNull(sales.invoiceId)
            ];
            if (input.projectId) salesConditions.push(eq(sales.projectId, input.projectId));

            const salesResult = await conn.select({
                total: sum(sales.amount)
            }).from(sales)
                .where(and(...salesConditions));

            const manualSalesTotal = Number(salesResult[0]?.total || 0);

            // Total Revenue = Installments + Invoices + Manual Sales
            const totalSales = instTotal + invoicesTotal + manualSalesTotal;
            const paidSales = instPaid + invoicesPaid + manualSalesTotal;

            return {
                totalExpenses, // Now includes purchases
                totalSales,
                paidSales,
                pendingSales: totalSales - paidSales,
                expensesByCategory,
                netProfit: paidSales - totalExpenses,
                profitMargin: paidSales > 0 ? ((paidSales - totalExpenses) / paidSales) * 100 : 0,
            };
        }),

    // 6. HR REPORT
    hrReport: protectedProcedure
        .input(dateFilterSchema.extend({
            departmentId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const perm = checkReportPermission(ctx.user.role, 'hr');

            const conn = await db.getDb();
            if (!conn) {
                let allEmployees = demo.list("employees");
                if (perm.onlyOwn) {
                    allEmployees = allEmployees.filter((e: any) => e.userId === ctx.user.id);
                }
                return {
                    totalEmployees: allEmployees.length,
                    employeesByDepartment: {} as Record<string, number>,
                    activeLeaves: 0,
                    recentEmployees: allEmployees.slice(0, 10),
                };
            }

            // If onlyOwn, show only the user's employee data
            if (perm.onlyOwn) {
                const empResult = await conn.select()
                    .from(employees)
                    .where(eq(employees.userId, ctx.user.id))
                    .limit(1);

                return {
                    totalEmployees: empResult.length,
                    employeesByDepartment: {},
                    activeLeaves: 0,
                    recentEmployees: empResult,
                };
            }

            // Total employees
            const totalResult = await conn.select({ count: count() }).from(employees);
            const totalEmployees = totalResult[0]?.count || 0;

            // Employees by department
            const deptResult = await conn.select({
                department: employees.department,
                count: count(),
            }).from(employees).groupBy(employees.department);

            const employeesByDepartment: Record<string, number> = {};
            deptResult.forEach(r => {
                employeesByDepartment[r.department || 'غير محدد'] = r.count;
            });

            // Recent employees
            const recentEmployees = await conn.select()
                .from(employees)
                .orderBy(sql`${employees.createdAt} DESC`)
                .limit(10);

            return {
                totalEmployees,
                employeesByDepartment,
                activeLeaves: 0, // TODO: Calculate from leaves table
                recentEmployees,
            };
        }),

    // 7. FORMS REPORT
    formsReport: protectedProcedure
        .input(dateFilterSchema.extend({
            status: z.string().optional(),
            clientId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            checkReportPermission(ctx.user.role, 'forms');

            const conn = await db.getDb();
            if (!conn) {
                const allForms = demo.list("forms");
                return {
                    totalForms: allForms.length,
                    formsByStatus: {} as Record<string, number>,
                    recentForms: allForms.slice(0, 10),
                };
            }

            const conditions: any[] = [];
            if (input.from) conditions.push(gte(forms.createdAt, input.from));
            if (input.to) conditions.push(lte(forms.createdAt, input.to));
            if (input.status) conditions.push(sql`${forms.status} = ${input.status}`);
            if (input.clientId) conditions.push(eq(forms.clientId, input.clientId));

            // Total forms
            const totalResult = await conn.select({ count: count() })
                .from(forms)
                .where(conditions.length ? and(...conditions) : undefined);
            const totalForms = totalResult[0]?.count || 0;

            // Forms by status
            const statusResult = await conn.select({
                status: forms.status,
                count: count(),
            }).from(forms)
                .where(conditions.length ? and(...conditions) : undefined)
                .groupBy(forms.status);

            const formsByStatus: Record<string, number> = {};
            statusResult.forEach(r => {
                formsByStatus[r.status || 'draft'] = r.count;
            });

            // Recent forms (without formData to reduce size)
            const recentFormsRaw = await conn.select({
                id: forms.id,
                formNumber: forms.formNumber,
                formType: forms.formType,
                status: forms.status,
                clientId: forms.clientId,
                projectId: forms.projectId,
                createdAt: forms.createdAt,
            }).from(forms)
                .where(conditions.length ? and(...conditions) : undefined)
                .orderBy(sql`${forms.createdAt} DESC`)
                .limit(10);

            return {
                totalForms,
                formsByStatus,
                recentForms: recentFormsRaw,
            };
        }),

    // 8. OVERVIEW REPORT (Dashboard-like summary)
    overviewReport: protectedProcedure
        .input(dateFilterSchema)
        .query(async ({ input, ctx }) => {
            const perm = checkReportPermission(ctx.user.role, 'overview');

            const conn = await db.getDb();
            if (!conn) {
                return {
                    clients: { total: demo.list("clients").length },
                    projects: { total: demo.list("projects").length },
                    invoices: { total: demo.list("invoices").length },
                    forms: { total: demo.list("forms").length },
                    financials: perm.canViewFinancials ? {
                        totalRevenue: 0,
                        totalExpenses: 0,
                        netProfit: 0,
                    } : null,
                };
            }

            const from = input.from ?? new Date(new Date().getFullYear(), 0, 1);
            const to = input.to ?? new Date();

            // Counts
            const [clientsCount, projectsCount, invoicesCount, formsCount] = await Promise.all([
                conn.select({ count: count() }).from(clients),
                conn.select({ count: count() }).from(projects),
                conn.select({ count: count() }).from(invoices)
                    .where(and(gte(invoices.issueDate, from), lte(invoices.issueDate, to))),
                conn.select({ count: count() }).from(forms)
                    .where(and(gte(forms.createdAt, from), lte(forms.createdAt, to))),
            ]);

            // Financials (only if allowed)
            let financials = null;
            if (perm.canViewFinancials) {
                const [expResult, invResult, instResult, purchResult, manualSalesResult] = await Promise.all([
                    // Expenses - filter by expenseDate
                    conn.select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
                        .from(expenses)
                        .where(and(gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)))

                    // Invoices (Mirroring accounting.ts logic + Date filter)
                    , conn.select({
                        total: sql<number>`COALESCE(SUM(${invoices.total}), 0)`,
                        paid: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.total} ELSE 0 END), 0)`
                    }).from(invoices)
                        .where(and(
                            gte(invoices.issueDate, from),
                            lte(invoices.issueDate, to),
                            eq(invoices.type, 'invoice'),
                            ne(invoices.status, 'cancelled')
                        )),

                    // Installments (All for total, Paid for paid - mirroring accounting.ts)
                    conn.select({
                        total: sql<number>`COALESCE(SUM(${installments.amount}), 0)`,
                        paid: sql<number>`COALESCE(SUM(CASE WHEN ${installments.status} = 'paid' THEN ${installments.amount} ELSE 0 END), 0)`,
                    }).from(installments)
                        .where(and(gte(installments.dueDate, from), lte(installments.dueDate, to))),

                    // Purchases - filter by purchaseDate
                    conn.select({ total: sql<number>`COALESCE(SUM(${purchases.amount}), 0)` })
                        .from(purchases)
                        .where(and(gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)))

                    // Manual Sales (Completed ONLY, not linked to invoices)
                    , conn.select({ total: sql<number>`COALESCE(SUM(${sales.amount}), 0)` })
                        .from(sales)
                        .where(and(
                            gte(sales.saleDate, from),
                            lte(sales.saleDate, to),
                            eq(sales.status, 'completed'),
                            isNull(sales.invoiceId)
                        )),
                ]);

                const totalOperatingExpenses = Number(expResult[0]?.total || 0);
                const totalPurchases = Number(purchResult[0]?.total || 0);
                const totalExpenses = totalOperatingExpenses + totalPurchases;

                const invoicesTotal = Number(invResult[0]?.total || 0);
                const invoicesPaid = Number(invResult[0]?.paid || 0);

                const instRevenue = Number(instResult[0]?.total || 0);
                const instPaid = Number(instResult[0]?.paid || 0);

                const manualSalesTotal = Number(manualSalesResult[0]?.total || 0);

                const totalRevenue = instRevenue + invoicesTotal + manualSalesTotal;
                const paidRevenue = instPaid + invoicesPaid + manualSalesTotal;

                financials = {
                    totalRevenue,
                    paidRevenue,
                    totalExpenses,
                    totalOperatingExpenses,
                    totalPurchases,
                    netProfit: paidRevenue - totalExpenses,
                    pendingRevenue: totalRevenue - paidRevenue,
                };
            }

            return {
                clients: { total: clientsCount[0]?.count || 0 },
                projects: { total: projectsCount[0]?.count || 0 },
                invoices: { total: invoicesCount[0]?.count || 0 },
                forms: { total: formsCount[0]?.count || 0 },
                financials,
            };
        }),

    // 9. SAVED REPORTS
    saveReport: protectedProcedure
        .input(z.object({
            name: z.string(),
            reportType: z.string(),
            filters: z.any(),
            data: z.any()
        }))
        .mutation(async ({ input, ctx }) => {
            const conn = await db.getDb();
            if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            await conn.insert(savedReports).values({
                name: input.name,
                reportType: input.reportType,
                filters: input.filters,
                data: input.data,
                createdBy: ctx.user.id
            });

            return { success: true };
        }),

    getSavedReports: protectedProcedure
        .query(async ({ ctx }) => {
            const conn = await db.getDb();
            if (!conn) return [];

            return await conn.select()
                .from(savedReports)
                .orderBy(sql`${savedReports.createdAt} DESC`);
        }),

    deleteSavedReport: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const conn = await db.getDb();
            if (!conn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

            await conn.delete(savedReports)
                .where(eq(savedReports.id, input.id));

            return { success: true };
        }),
});
