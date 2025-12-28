import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { and, gte, lte, sql } from "drizzle-orm";
import { invoices, expenses, installments, purchases } from "../../drizzle/schema";
import * as demo from "../_core/demoStore";

export const reportsRouter = router({
  summary: protectedProcedure
    .input(z.object({
      from: z.date().optional(),
      to: z.date().optional(),
      clientId: z.number().optional(),
      projectId: z.number().optional(),
      invoiceStatus: z.enum(["draft", "sent", "paid", "cancelled"]).optional(),
      purchaseStatus: z.enum(["pending", "completed", "cancelled"]).optional(),
      installmentStatus: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
      expenseStatus: z.enum(["active", "cancelled"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (process.env.NODE_ENV === 'production' && !['admin', 'accountant', 'finance_manager'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      // Basic permission guard if needed
      // await ensurePerm(ctx, 'accounting');
      const conn = await db.getDb();
      if (!conn) {
        const from = input.from ?? new Date(0);
        const to = input.to ?? new Date();
        const within = (d: Date | number | string | null | undefined) => {
          const dt = d ? new Date(d as any) : null;
          if (!dt) return false;
          return dt >= from && dt <= to;
        };
        const invRows = demo.list("invoices").filter((r: any) => within(r.issueDate));
        const purRows = demo.list("purchases").filter((r: any) => within(r.purchaseDate));
        const expRows = demo.list("expenses").filter((r: any) => within(r.expenseDate));
        const instRows = demo.list("installments").filter((r: any) => within(r.createdAt));
        return {
          invoicesTotal: invRows.reduce((s: number, r: any) => s + Number(r.total || 0), 0),
          purchasesTotal: purRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
          expensesTotal: expRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
          installmentsTotal: instRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
          net: invRows.reduce((s: number, r: any) => s + Number(r.total || 0), 0)
            + instRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
            - purRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
            - expRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
        };
      }
      const from = input.from ?? new Date(0);
      const to = input.to ?? new Date();
      const invWhere = [gte(invoices.issueDate, from), lte(invoices.issueDate, to)];
      if (input.clientId) invWhere.push(sql`${invoices.clientId} = ${input.clientId}`);
      if (input.projectId) invWhere.push(sql`${invoices.projectId} = ${input.projectId}`);
      if (input.invoiceStatus) invWhere.push(sql`${invoices.status} = ${input.invoiceStatus}`);
      const invSum = await conn.select({ total: sql<number>`SUM(${invoices.total})` })
        .from(invoices)
        .where(and(...invWhere));
      const purWhere = [gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)];
      if (input.projectId) purWhere.push(sql`${purchases.projectId} = ${input.projectId}`);
      if (input.purchaseStatus) purWhere.push(sql`${purchases.status} = ${input.purchaseStatus}`);
      const purSum = await conn.select({ total: sql<number>`SUM(${purchases.amount})` })
        .from(purchases)
        .where(and(...purWhere));
      const expWhere = [gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)];
      if (input.projectId) expWhere.push(sql`${expenses.projectId} = ${input.projectId}`);
      if (input.expenseStatus) expWhere.push(sql`${expenses.status} = ${input.expenseStatus}`);
      const expSum = await conn.select({ total: sql<number>`SUM(${expenses.amount})` })
        .from(expenses)
        .where(and(...expWhere));
      const instWhere = [gte(installments.createdAt, from), lte(installments.createdAt, to)];
      if (input.projectId) instWhere.push(sql`${installments.projectId} = ${input.projectId}`);
      if (input.installmentStatus) instWhere.push(sql`${installments.status} = ${input.installmentStatus}`);
      const instSum = await conn.select({ total: sql<number>`SUM(${installments.amount})` })
        .from(installments)
        .where(and(...instWhere));
      const invoicesTotal = invSum[0]?.total ?? 0;
      const purchasesTotal = purSum[0]?.total ?? 0;
      const expensesTotal = expSum[0]?.total ?? 0;
      const installmentsTotal = instSum[0]?.total ?? 0;
      const net = invoicesTotal + installmentsTotal - purchasesTotal - expensesTotal;
      return { invoicesTotal, purchasesTotal, expensesTotal, installmentsTotal, net };
    }),
  timeseries: protectedProcedure
    .input(z.object({
      from: z.date(),
      to: z.date(),
      granularity: z.enum(["day", "month"]).default("day"),
      clientId: z.number().optional(),
      projectId: z.number().optional(),
      invoiceStatus: z.enum(["draft", "sent", "paid", "cancelled"]).optional(),
      purchaseStatus: z.enum(["pending", "completed", "cancelled"]).optional(),
      installmentStatus: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
      expenseStatus: z.enum(["active", "cancelled"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (process.env.NODE_ENV === 'production' && !['admin', 'accountant', 'finance_manager'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const conn = await db.getDb();
      const from = input.from;
      const to = input.to;
      const range: Array<{ key: string; date: Date }> = [];
      const cursor = new Date(from);
      const makeKey = (d: Date) => input.granularity === "month" ? `${d.getFullYear()}-${d.getMonth() + 1}` : d.toISOString().substring(0, 10);
      while (cursor <= to) {
        range.push({ key: makeKey(cursor), date: new Date(cursor) });
        if (input.granularity === "month") {
          cursor.setMonth(cursor.getMonth() + 1);
          cursor.setDate(1);
        } else {
          cursor.setDate(cursor.getDate() + 1);
        }
      }
      if (!conn) {
        const invRows = demo.list("invoices");
        const expRows = demo.list("expenses");
        const instRows = demo.list("installments");
        const makeKey = (d: Date) => input.granularity === "month" ? `${d.getFullYear()}-${d.getMonth() + 1}` : d.toISOString().substring(0, 10);
        const acc: Record<string, { invoices: number; expenses: number; installments: number }> = {};
        range.forEach(r => { acc[r.key] = { invoices: 0, expenses: 0, installments: 0 }; });
        invRows.forEach((r: any) => {
          const d = new Date(r.issueDate || r.createdAt || Date.now());
          const k = makeKey(d);
          if (acc[k]) acc[k].invoices += Number(r.total || 0);
        });
        expRows.forEach((r: any) => {
          const d = new Date(r.expenseDate || r.createdAt || Date.now());
          const k = makeKey(d);
          if (acc[k]) acc[k].expenses += Number(r.amount || 0);
        });
        instRows.forEach((r: any) => {
          const d = new Date(r.createdAt || Date.now());
          const k = makeKey(d);
          if (acc[k]) acc[k].installments += Number(r.amount || 0);
        });
        return range.map(r => {
          const v = acc[r.key] || { invoices: 0, expenses: 0, installments: 0 };
          const net = v.invoices + v.installments - v.expenses;
          return { dateKey: r.key, invoices: v.invoices, expenses: v.expenses, installments: v.installments, net };
        });
      }
      const invWhere = [gte(invoices.issueDate, from), lte(invoices.issueDate, to)];
      if (input.clientId) invWhere.push(sql`${invoices.clientId} = ${input.clientId}`);
      if (input.projectId) invWhere.push(sql`${invoices.projectId} = ${input.projectId}`);
      if (input.invoiceStatus) invWhere.push(sql`${invoices.status} = ${input.invoiceStatus}`);
      const invRows = await conn.select().from(invoices).where(and(...invWhere));
      const expWhere = [gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)];
      if (input.projectId) expWhere.push(sql`${expenses.projectId} = ${input.projectId}`);
      if (input.expenseStatus) expWhere.push(sql`${expenses.status} = ${input.expenseStatus}`);
      const expRows = await conn.select().from(expenses).where(and(...expWhere));
      const instWhere = [gte(installments.createdAt, from), lte(installments.createdAt, to)];
      if (input.projectId) instWhere.push(sql`${installments.projectId} = ${input.projectId}`);
      if (input.installmentStatus) instWhere.push(sql`${installments.status} = ${input.installmentStatus}`);
      const instRows = await conn.select().from(installments).where(and(...instWhere));
      const acc: Record<string, { invoices: number; expenses: number; installments: number; purchases: number }> = {};
      range.forEach(r => { acc[r.key] = { invoices: 0, expenses: 0, installments: 0, purchases: 0 }; });
      invRows.forEach((r: any) => {
        const d = new Date(r.issueDate);
        const key = makeKey(d);
        if (acc[key]) acc[key].invoices += Number(r.total || 0);
      });
      expRows.forEach((r: any) => {
        const d = new Date(r.expenseDate);
        const key = makeKey(d);
        if (acc[key]) acc[key].expenses += Number(r.amount || 0);
      });
      instRows.forEach((r: any) => {
        const d = new Date(r.createdAt);
        const key = makeKey(d);
        if (acc[key]) acc[key].installments += Number(r.amount || 0);
      });
      // Purchases aggregation
      const purWhere = [gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)];
      if (input.projectId) purWhere.push(sql`${purchases.projectId} = ${input.projectId}`);
      if (input.purchaseStatus) purWhere.push(sql`${purchases.status} = ${input.purchaseStatus}`);
      const purRows = await conn.select().from(purchases).where(and(...purWhere));
      purRows.forEach((r: any) => {
        const d = new Date(r.purchaseDate);
        const key = makeKey(d);
        if (acc[key]) acc[key].purchases += Number(r.amount || 0);
      });

      return range.map(r => {
        const v = acc[r.key] || { invoices: 0, expenses: 0, installments: 0, purchases: 0 };
        const net = v.invoices + v.installments - v.expenses - v.purchases;
        return { dateKey: r.key, invoices: v.invoices, expenses: v.expenses, installments: v.installments, purchases: v.purchases, net };
      });
    })
  ,
  timeseriesBreakdown: protectedProcedure
    .input(z.object({
      from: z.date(),
      to: z.date(),
      granularity: z.enum(["day", "month"]).default("day"),
      clientId: z.number().optional(),
      projectId: z.number().optional(),
      invoiceStatuses: z.array(z.enum(["draft", "sent", "paid", "cancelled"])).optional(),
      purchaseStatuses: z.array(z.enum(["pending", "completed", "cancelled"])).optional(),
      expenseStatuses: z.array(z.enum(["active", "cancelled"])).optional(),
      installmentStatuses: z.array(z.enum(["pending", "paid", "overdue", "cancelled"])).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (process.env.NODE_ENV === 'production' && !['admin', 'accountant', 'finance_manager'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const conn = await db.getDb();
      const from = input.from;
      const to = input.to;
      const range: Array<{ key: string; date: Date }> = [];
      const cursor = new Date(from);
      const makeKey = (d: Date) => input.granularity === "month" ? `${d.getFullYear()}-${d.getMonth() + 1}` : d.toISOString().substring(0, 10);
      while (cursor <= to) {
        range.push({ key: makeKey(cursor), date: new Date(cursor) });
        if (input.granularity === "month") {
          cursor.setMonth(cursor.getMonth() + 1);
          cursor.setDate(1);
        } else {
          cursor.setDate(cursor.getDate() + 1);
        }
      }
      const invoiceStatuses = input.invoiceStatuses ?? ["draft", "sent", "paid", "cancelled"];
      const purchaseStatuses = input.purchaseStatuses ?? ["pending", "completed", "cancelled"];
      const expenseStatuses = (input as any).expenseStatuses ?? ["active", "cancelled"];
      const installmentStatuses = (input as any).installmentStatuses ?? ["pending", "paid", "overdue", "cancelled"];
      const initInv: Record<string, number> = Object.fromEntries(invoiceStatuses.map(s => [s, 0]));
      const initPur: Record<string, number> = Object.fromEntries(purchaseStatuses.map(s => [s, 0]));
      const initExp: Record<string, number> = Object.fromEntries(expenseStatuses.map((s: string) => [s, 0]));
      const initInst: Record<string, number> = Object.fromEntries(installmentStatuses.map((s: string) => [s, 0]));
      const acc: Record<string, { invoices: Record<string, number>; purchases: Record<string, number>; expenses: Record<string, number>; installments: Record<string, number> }> = {};
      range.forEach(r => { acc[r.key] = { invoices: { ...initInv }, purchases: { ...initPur }, expenses: { ...initExp }, installments: { ...initInst } }; });
      if (!conn) {
        return range.map(r => ({ dateKey: r.key, invoices: { ...initInv }, purchases: { ...initPur } }));
      }
      const invWhere = [gte(invoices.issueDate, from), lte(invoices.issueDate, to)];
      if (input.clientId) invWhere.push(sql`${invoices.clientId} = ${input.clientId}`);
      if (input.projectId) invWhere.push(sql`${invoices.projectId} = ${input.projectId}`);
      const invRows = await conn.select().from(invoices).where(and(...invWhere));
      invRows.forEach((r: any) => {
        const d = new Date(r.issueDate);
        const key = makeKey(d);
        const st = r.status as string;
        if (acc[key] && (invoiceStatuses as any).includes(st)) {
          acc[key].invoices[st] = (acc[key].invoices[st] || 0) + Number(r.total || 0);
        }
      });
      const purWhere = [gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)];
      if (input.projectId) purWhere.push(sql`${purchases.projectId} = ${input.projectId}`);
      const purRows = await conn.select().from(purchases).where(and(...purWhere));
      purRows.forEach((r: any) => {
        const d = new Date(r.purchaseDate);
        const key = makeKey(d);
        const st = r.status as string;
        if (acc[key] && (purchaseStatuses as any).includes(st)) {
          acc[key].purchases[st] = (acc[key].purchases[st] || 0) + Number(r.amount || 0);
        }
      });
      const expWhere = [gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)];
      if (input.projectId) expWhere.push(sql`${expenses.projectId} = ${input.projectId}`);
      const expRows = await conn.select().from(expenses).where(and(...expWhere));
      expRows.forEach((r: any) => {
        const d = new Date(r.expenseDate);
        const key = makeKey(d);
        const st = r.status as string;
        if (acc[key] && (expenseStatuses as any).includes(st)) {
          acc[key].expenses[st] = (acc[key].expenses[st] || 0) + Number(r.amount || 0);
        }
      });
      const instWhere = [gte(installments.createdAt, from), lte(installments.createdAt, to)];
      if (input.projectId) instWhere.push(sql`${installments.projectId} = ${input.projectId}`);
      const instRows = await conn.select().from(installments).where(and(...instWhere));
      instRows.forEach((r: any) => {
        const d = new Date(r.createdAt);
        const key = makeKey(d);
        const st = r.status as string;
        if (acc[key] && (installmentStatuses as any).includes(st)) {
          acc[key].installments[st] = (acc[key].installments[st] || 0) + Number(r.amount || 0);
        }
      });
      return range.map(r => ({ dateKey: r.key, invoices: acc[r.key].invoices, purchases: acc[r.key].purchases, expenses: acc[r.key].expenses, installments: acc[r.key].installments }));
    })
});
