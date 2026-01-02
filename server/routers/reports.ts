import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { and, gte, lte, sql, eq, desc, isNull, inArray, ne } from "drizzle-orm";
import { invoices, expenses, installments, purchases, sales, clients } from "../../drizzle/schema";
import * as demo from "../_core/demoStore";
import { ensurePerm } from "../utils/permissions";

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
      expenseStatus: z.enum(["active", "processing", "completed", "cancelled"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      await ensurePerm(ctx, 'reports');

      const conn = await db.getDb();
      if (!conn) {
        const from = input.from ?? new Date(0);
        const to = input.to ?? new Date();
        const within = (d: Date | number | string | null | undefined) => {
          const dt = d ? new Date(d as any) : null;
          if (!dt) return false;
          return dt >= from && dt <= to;
        };

        // Invoices - filter by type='invoice' and exclude cancelled
        let invRows = demo.list("invoices").filter((r: any) =>
          r.type === 'invoice' &&
          r.status !== 'cancelled' &&
          within(r.issueDate)
        );
        if (input.invoiceStatus) invRows = invRows.filter((r: any) => r.status === input.invoiceStatus);
        if (input.clientId) invRows = invRows.filter((r: any) => r.clientId === input.clientId);
        if (input.projectId) invRows = invRows.filter((r: any) => r.projectId === input.projectId);

        const paidInvRows = invRows.filter((r: any) => r.status === 'paid');

        // Purchases - filter by status (default: completed)
        let purRows = demo.list("purchases").filter((r: any) => within(r.purchaseDate));
        if (input.purchaseStatus) {
          purRows = purRows.filter((r: any) => r.status === input.purchaseStatus);
        } else {
          purRows = purRows.filter((r: any) => r.status === 'completed');
        }
        if (input.projectId) purRows = purRows.filter((r: any) => r.projectId === input.projectId);

        // Expenses - filter by status (default: active, processing, completed - exclude cancelled)
        let expRows = demo.list("expenses").filter((r: any) => within(r.expenseDate));
        if (input.expenseStatus) {
          expRows = expRows.filter((r: any) => r.status === input.expenseStatus);
        } else {
          expRows = expRows.filter((r: any) => !r.status || r.status !== 'cancelled');
        }
        if (input.projectId) expRows = expRows.filter((r: any) => r.projectId === input.projectId);

        // Installments - calculate total and paid separately
        let instRows = demo.list("installments").filter((r: any) => within(r.dueDate || r.createdAt));
        if (input.installmentStatus) instRows = instRows.filter((r: any) => r.status === input.installmentStatus);
        if (input.projectId) instRows = instRows.filter((r: any) => r.projectId === input.projectId);

        const paidInstRows = instRows.filter((r: any) => r.status === 'paid');

        // Manual Sales - completed only, not linked to invoices
        let salesRows = demo.list("sales").filter((r: any) =>
          within(r.saleDate) &&
          r.status === 'completed' &&
          !r.invoiceId
        );
        if (input.projectId) salesRows = salesRows.filter((r: any) => r.projectId === input.projectId);

        const invoicesTotal = invRows.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
        const paidInvoicesTotal = paidInvRows.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
        const purchasesTotal = purRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const expensesTotal = expRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const installmentsTotal = instRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const paidInstallmentsTotal = paidInstRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const manualSalesTotal = salesRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

        // Net = paid invoices + paid installments + manual sales - purchases - expenses
        const net = paidInvoicesTotal + paidInstallmentsTotal + manualSalesTotal - purchasesTotal - expensesTotal;

        console.log('[Reports Summary - Demo Mode]', {
          invoicesTotal,
          paidInvoicesTotal,
          purchasesTotal,
          expensesTotal,
          installmentsTotal,
          paidInstallmentsTotal,
          manualSalesTotal,
          net
        });

        return {
          invoicesTotal,
          invoicesCount: invRows.length,
          paidInvoicesTotal,
          paidInvoicesCount: paidInvRows.length,
          purchasesTotal,
          expensesTotal,
          installmentsTotal,
          manualSalesTotal,
          net,
        };
      }

      const from = input.from ?? new Date(0);
      const to = input.to ?? new Date();

      // All invoices (for total value display)
      const invWhere = [
        gte(invoices.issueDate, from),
        lte(invoices.issueDate, to),
        eq(invoices.type, 'invoice'),
        ne(invoices.status, 'cancelled')
      ];
      if (input.clientId) invWhere.push(eq(invoices.clientId, input.clientId));
      if (input.projectId) invWhere.push(eq(invoices.projectId, input.projectId));
      if (input.invoiceStatus) invWhere.push(eq(invoices.status, input.invoiceStatus));

      const invSum = await conn.select({
        total: sql<number>`SUM(${invoices.total})`,
        count: sql<number>`COUNT(${invoices.id})`
      })
        .from(invoices)
        .where(and(...invWhere));

      // Paid invoices only (for revenue calculation)
      const paidInvWhere = [
        gte(invoices.issueDate, from),
        lte(invoices.issueDate, to),
        eq(invoices.status, 'paid'),
        eq(invoices.type, 'invoice')
      ];
      if (input.clientId) paidInvWhere.push(eq(invoices.clientId, input.clientId));
      if (input.projectId) paidInvWhere.push(eq(invoices.projectId, input.projectId));

      const paidInvSum = await conn.select({
        total: sql<number>`SUM(${invoices.total})`,
        count: sql<number>`COUNT(${invoices.id})`
      })
        .from(invoices)
        .where(and(...paidInvWhere));

      // Purchases
      const purWhere = [gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)];
      if (input.projectId) purWhere.push(eq(purchases.projectId, input.projectId));
      if (input.purchaseStatus) {
        purWhere.push(eq(purchases.status, input.purchaseStatus));
      } else {
        purWhere.push(eq(purchases.status, 'completed'));
      }
      const purSum = await conn.select({ total: sql<number>`SUM(${purchases.amount})` })
        .from(purchases)
        .where(and(...purWhere));

      // Expenses
      const expWhere = [gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)];
      if (input.projectId) expWhere.push(eq(expenses.projectId, input.projectId));
      if (input.expenseStatus) {
        expWhere.push(eq(expenses.status, input.expenseStatus));
      } else {
        expWhere.push(ne(expenses.status, 'cancelled'));
      }
      const expSum = await conn.select({ total: sql<number>`SUM(${expenses.amount})` })
        .from(expenses)
        .where(and(...expWhere));

      // Installments - total and paid
      const instWhere = [gte(installments.dueDate, from), lte(installments.dueDate, to)];
      if (input.projectId) instWhere.push(eq(installments.projectId, input.projectId));
      if (input.installmentStatus) instWhere.push(eq(installments.status, input.installmentStatus));

      const instSum = await conn.select({
        total: sql<number>`SUM(${installments.amount})`,
        paid: sql<number>`SUM(CASE WHEN ${installments.status} = 'paid' THEN ${installments.amount} ELSE 0 END)`
      })
        .from(installments)
        .where(and(...instWhere));

      // Sales (Manual) - completed only, not linked to invoices
      const salesWhere = [
        gte(sales.saleDate, from),
        lte(sales.saleDate, to),
        eq(sales.status, 'completed'),
        isNull(sales.invoiceId)
      ];
      if (input.projectId) salesWhere.push(eq(sales.projectId, input.projectId));
      if (input.clientId) salesWhere.push(eq(sales.clientId, input.clientId));

      const salesSum = await conn.select({ total: sql<number>`SUM(${sales.amount})` })
        .from(sales)
        .where(and(...salesWhere));

      const invoicesTotal = Number(invSum[0]?.total ?? 0);
      const invoicesCount = Number(invSum[0]?.count ?? 0);
      const paidInvoicesTotal = Number(paidInvSum[0]?.total ?? 0);
      const paidInvoicesCount = Number(paidInvSum[0]?.count ?? 0);
      const purchasesTotal = Number(purSum[0]?.total ?? 0);
      const expensesTotal = Number(expSum[0]?.total ?? 0);
      const installmentsTotal = Number(instSum[0]?.total ?? 0);
      const paidInstallmentsTotal = Number(instSum[0]?.paid ?? 0);
      const manualSalesTotal = Number(salesSum[0]?.total ?? 0);

      // Net profit = paid invoices + paid installments + manual sales - expenses - purchases
      const net = paidInvoicesTotal + paidInstallmentsTotal + manualSalesTotal - purchasesTotal - expensesTotal;

      console.log('[Reports Summary - DB Mode]', {
        invoicesTotal,
        invoicesCount,
        paidInvoicesTotal,
        paidInvoicesCount,
        purchasesTotal,
        expensesTotal,
        installmentsTotal,
        paidInstallmentsTotal,
        manualSalesTotal,
        net
      });

      return {
        invoicesTotal,
        invoicesCount,
        paidInvoicesTotal,
        paidInvoicesCount,
        purchasesTotal,
        expensesTotal,
        installmentsTotal,
        manualSalesTotal,
        net
      };
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
      expenseStatus: z.enum(["active", "processing", "completed", "cancelled"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      await ensurePerm(ctx, 'reports');
      const conn = await db.getDb();
      const from = input.from;
      const to = input.to;
      const range: Array<{ key: string; date: Date }> = [];
      const cursor = new Date(from);
      const makeKey = (d: Date) => {
        if (input.granularity === "month") {
          const month = d.getMonth() + 1;
          return `${d.getFullYear()}-${month < 10 ? '0' + month : month}`;
        }
        return d.toISOString().substring(0, 10);
      };

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
        const purRows = demo.list("purchases");
        const salesRows = demo.list("sales");

        const acc: Record<string, { invoices: number; expenses: number; installments: number; purchases: number; sales: number }> = {};
        range.forEach(r => { acc[r.key] = { invoices: 0, expenses: 0, installments: 0, purchases: 0, sales: 0 }; });

        invRows.forEach((r: any) => {
          if (r.type === 'invoice' && r.status === 'paid') {
            const d = new Date(r.issueDate || r.createdAt || Date.now());
            const k = makeKey(d);
            if (acc[k]) acc[k].invoices += Number(r.total || 0);
          }
        });

        expRows.forEach((r: any) => {
          if (r.status !== 'cancelled') {
            const d = new Date(r.expenseDate || r.createdAt || Date.now());
            const k = makeKey(d);
            if (acc[k]) acc[k].expenses += Number(r.amount || 0);
          }
        });

        instRows.forEach((r: any) => {
          if (r.status === 'paid') {
            const d = new Date(r.dueDate || r.createdAt || Date.now());
            const k = makeKey(d);
            if (acc[k]) acc[k].installments += Number(r.amount || 0);
          }
        });

        purRows.forEach((r: any) => {
          if (r.status === 'completed') {
            const d = new Date(r.purchaseDate || r.createdAt || Date.now());
            const k = makeKey(d);
            if (acc[k]) acc[k].purchases += Number(r.amount || 0);
          }
        });

        salesRows.forEach((r: any) => {
          if (r.status === 'completed' && !r.invoiceId) {
            const d = new Date(r.saleDate || r.createdAt || Date.now());
            const k = makeKey(d);
            if (acc[k]) acc[k].sales += Number(r.amount || 0);
          }
        });

        return range.map(r => {
          const v = acc[r.key] || { invoices: 0, expenses: 0, installments: 0, purchases: 0, sales: 0 };
          const totalRevenue = v.invoices + v.installments + v.sales;
          const totalExpenses = v.expenses + v.purchases;
          const net = totalRevenue - totalExpenses;
          return {
            dateKey: r.key,
            invoices: totalRevenue,  // Combined revenue
            expenses: totalExpenses, // Combined expenses
            installments: v.installments, // Keep for backwards compatibility
            purchases: v.purchases,  // Keep for backwards compatibility
            net
          };
        });
      }

      // Database query with proper filters
      const invWhere = [
        gte(invoices.issueDate, from),
        lte(invoices.issueDate, to),
        eq(invoices.type, 'invoice'),
        eq(invoices.status, 'paid') // Only paid invoices count as revenue
      ];
      if (input.clientId) invWhere.push(sql`${invoices.clientId} = ${input.clientId}`);
      if (input.projectId) invWhere.push(sql`${invoices.projectId} = ${input.projectId}`);

      const invRows = await conn.select().from(invoices).where(and(...invWhere));

      const expWhere = [
        gte(expenses.expenseDate, from),
        lte(expenses.expenseDate, to),
        ne(expenses.status, 'cancelled') // Exclude cancelled
      ];
      if (input.projectId) expWhere.push(sql`${expenses.projectId} = ${input.projectId}`);
      if (input.expenseStatus) expWhere.push(sql`${expenses.status} = ${input.expenseStatus}`);

      const expRows = await conn.select().from(expenses).where(and(...expWhere));

      const instWhere = [
        gte(installments.dueDate, from),
        lte(installments.dueDate, to),
        eq(installments.status, 'paid') // Only paid installments count as revenue
      ];
      if (input.projectId) instWhere.push(sql`${installments.projectId} = ${input.projectId}`);

      const instRows = await conn.select().from(installments).where(and(...instWhere));

      const purWhere = [
        gte(purchases.purchaseDate, from),
        lte(purchases.purchaseDate, to),
        eq(purchases.status, 'completed') // Only completed purchases count
      ];
      if (input.projectId) purWhere.push(sql`${purchases.projectId} = ${input.projectId}`);

      const purRows = await conn.select().from(purchases).where(and(...purWhere));

      // Manual sales - completed only, not linked to invoices
      const salesWhere = [
        gte(sales.saleDate, from),
        lte(sales.saleDate, to),
        eq(sales.status, 'completed'),
        isNull(sales.invoiceId)
      ];
      if (input.projectId) salesWhere.push(sql`${sales.projectId} = ${input.projectId}`);

      const salesRows = await conn.select().from(sales).where(and(...salesWhere));

      const acc: Record<string, { invoices: number; expenses: number; installments: number; purchases: number; sales: number }> = {};
      range.forEach(r => { acc[r.key] = { invoices: 0, expenses: 0, installments: 0, purchases: 0, sales: 0 }; });

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
        const d = new Date(r.dueDate);
        const key = makeKey(d);
        if (acc[key]) acc[key].installments += Number(r.amount || 0);
      });

      purRows.forEach((r: any) => {
        const d = new Date(r.purchaseDate);
        const key = makeKey(d);
        if (acc[key]) acc[key].purchases += Number(r.amount || 0);
      });

      salesRows.forEach((r: any) => {
        const d = new Date(r.saleDate);
        const key = makeKey(d);
        if (acc[key]) acc[key].sales += Number(r.amount || 0);
      });

      return range.map(r => {
        const v = acc[r.key] || { invoices: 0, expenses: 0, installments: 0, purchases: 0, sales: 0 };
        const totalRevenue = v.invoices + v.installments + v.sales;
        const totalExpenses = v.expenses + v.purchases;
        const net = totalRevenue - totalExpenses;

        return {
          dateKey: r.key,
          invoices: totalRevenue,  // Combined revenue for charts
          expenses: totalExpenses, // Combined expenses for charts
          installments: v.installments, // Keep separate for reference
          purchases: v.purchases,  // Keep separate for reference
          net
        };
      });
    }),

  timeseriesBreakdown: protectedProcedure
    .input(z.object({
      from: z.date(),
      to: z.date(),
      granularity: z.enum(["day", "month"]).default("day"),
      clientId: z.number().optional(),
      projectId: z.number().optional(),
      invoiceStatuses: z.array(z.enum(["draft", "sent", "paid", "cancelled"])).optional(),
      purchaseStatuses: z.array(z.enum(["pending", "completed", "cancelled"])).optional(),
      expenseStatuses: z.array(z.enum(["active", "processing", "completed", "cancelled"])).optional(),
      installmentStatuses: z.array(z.enum(["pending", "paid", "overdue", "cancelled"])).optional(),
    }))
    .query(async ({ input, ctx }) => {
      await ensurePerm(ctx, 'reports');
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
      const expenseStatuses = input.expenseStatuses ?? ["active", "processing", "completed", "cancelled"];
      const installmentStatuses = input.installmentStatuses ?? ["pending", "paid", "overdue", "cancelled"];
      const salesStatuses = ["pending", "completed", "cancelled"]; // For manual sales
      const initInv: Record<string, number> = Object.fromEntries(invoiceStatuses.map(s => [s, 0]));
      const initPur: Record<string, number> = Object.fromEntries(purchaseStatuses.map(s => [s, 0]));
      const initExp: Record<string, number> = Object.fromEntries(expenseStatuses.map((s: string) => [s, 0]));
      const initInst: Record<string, number> = Object.fromEntries(installmentStatuses.map((s: string) => [s, 0]));
      const initSales: Record<string, number> = Object.fromEntries(salesStatuses.map(s => [s, 0]));
      const acc: Record<string, { invoices: Record<string, number>; purchases: Record<string, number>; expenses: Record<string, number>; installments: Record<string, number>; sales: Record<string, number> }> = {};
      range.forEach(r => { acc[r.key] = { invoices: { ...initInv }, purchases: { ...initPur }, expenses: { ...initExp }, installments: { ...initInst }, sales: { ...initSales } }; });
      if (!conn) {
        return range.map(r => ({ dateKey: r.key, invoices: { ...initInv }, purchases: { ...initPur }, expenses: { ...initExp }, installments: { ...initInst }, sales: { ...initSales } }));
      }
      const invWhere = [gte(invoices.issueDate, from), lte(invoices.issueDate, to)];
      if (input.clientId) invWhere.push(sql`${invoices.clientId} = ${input.clientId}`);
      if (input.projectId) invWhere.push(sql`${invoices.projectId} = ${input.projectId}`);
      invWhere.push(sql`${invoices.type} = 'invoice'`);
      const invRows = await conn.select().from(invoices).where(and(...invWhere));

      // Aggregate invoices by status
      invRows.forEach((r: any) => {
        const d = new Date(r.issueDate);
        const key = makeKey(d);
        const st = r.status as string;
        if (acc[key] && invoiceStatuses.includes(st as any)) {
          acc[key].invoices[st] = (acc[key].invoices[st] || 0) + Number(r.total || 0);
        }
      });

      const expWhere = [gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)];
      if (input.projectId) expWhere.push(sql`${expenses.projectId} = ${input.projectId}`);
      const expRows = await conn.select().from(expenses).where(and(...expWhere));

      // Aggregate expenses by status
      expRows.forEach((r: any) => {
        const d = new Date(r.expenseDate);
        const key = makeKey(d);
        const st = (r.status || 'active') as string;
        if (acc[key] && expenseStatuses.includes(st as any)) {
          acc[key].expenses[st] = (acc[key].expenses[st] || 0) + Number(r.amount || 0);
        }
      });

      const instWhere = [gte(installments.dueDate, from), lte(installments.dueDate, to)];
      if (input.projectId) instWhere.push(sql`${installments.projectId} = ${input.projectId}`);
      const instRows = await conn.select().from(installments).where(and(...instWhere));

      // Aggregate installments by status
      instRows.forEach((r: any) => {
        const d = new Date(r.dueDate);
        const key = makeKey(d);
        const st = r.status as string;
        if (acc[key] && installmentStatuses.includes(st as any)) {
          acc[key].installments[st] = (acc[key].installments[st] || 0) + Number(r.amount || 0);
        }
      });

      // Purchases aggregation by status
      const purWhere = [gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)];
      if (input.projectId) purWhere.push(sql`${purchases.projectId} = ${input.projectId}`);
      const purRows = await conn.select().from(purchases).where(and(...purWhere));

      // Aggregate purchases by status
      purRows.forEach((r: any) => {
        const d = new Date(r.purchaseDate);
        const key = makeKey(d);
        const st = r.status as string;
        if (acc[key] && purchaseStatuses.includes(st as any)) {
          acc[key].purchases[st] = (acc[key].purchases[st] || 0) + Number(r.amount || 0);
        }
      });

      // Add sales aggregation by status
      const salesWhere = [gte(sales.saleDate, from), lte(sales.saleDate, to), isNull(sales.invoiceId)];
      if (input.projectId) salesWhere.push(sql`${sales.projectId} = ${input.projectId}`);
      const salesRows = await conn.select().from(sales).where(and(...salesWhere));

      salesRows.forEach((r: any) => {
        const d = new Date(r.saleDate);
        const key = makeKey(d);
        const st = r.status as string;
        if (acc[key] && salesStatuses.includes(st)) {
          acc[key].sales[st] = (acc[key].sales[st] || 0) + Number(r.amount || 0);
        }
      });

      return range.map(r => ({ dateKey: r.key, invoices: acc[r.key].invoices, purchases: acc[r.key].purchases, expenses: acc[r.key].expenses, installments: acc[r.key].installments, sales: acc[r.key].sales }));
    }),

  breakdownDetails: protectedProcedure
    .input(z.object({
      from: z.date(),
      to: z.date(),
      clientId: z.number().optional(),
      projectId: z.number().optional(),
      invoiceStatuses: z.array(z.string()).optional(),
      purchaseStatuses: z.array(z.string()).optional(),
      expenseStatuses: z.array(z.string()).optional(),
      installmentStatuses: z.array(z.string()).optional(),
    }))
    .query(async ({ input, ctx }) => {
      await ensurePerm(ctx, 'reports');
      const conn = await db.getDb();
      const from = input.from;
      const to = input.to;
      const results: Array<{ date: Date; type: string; number: string; party: string; description: string; amount: number; status: string; projectId: number | null }> = [];

      if (!conn) return [];

      // 1. Invoices
      const invWhere = [gte(invoices.issueDate, from), lte(invoices.issueDate, to), eq(invoices.type, 'invoice')];
      if (input.clientId) invWhere.push(eq(invoices.clientId, input.clientId));
      if (input.projectId) invWhere.push(eq(invoices.projectId, input.projectId));
      if (input.invoiceStatuses && input.invoiceStatuses.length > 0) {
        invWhere.push(inArray(invoices.status, input.invoiceStatuses as any));
      }

      const invRows = await conn.select({
        issueDate: invoices.issueDate,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        status: invoices.status,
        projectId: invoices.projectId,
        notes: invoices.notes,
        clientName: clients.name
      })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(and(...invWhere));

      invRows.forEach((r: any) => {
        if (input.invoiceStatuses && !input.invoiceStatuses.includes(r.status || '')) return;
        results.push({
          date: new Date(r.issueDate),
          type: 'فاتورة',
          number: r.invoiceNumber,
          party: r.clientName || 'عميل محذوف',
          description: r.notes || '-',
          amount: Number(r.total || 0),
          status: r.status || '-',
          projectId: r.projectId
        });
      });

      // 2. Purchases
      const purWhere = [gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)];
      if (input.projectId) purWhere.push(eq(purchases.projectId, input.projectId));
      const purRows = await conn.select().from(purchases).where(and(...purWhere));

      purRows.forEach((r: any) => {
        if (input.purchaseStatuses && !input.purchaseStatuses.includes(r.status || '')) return;
        results.push({
          date: new Date(r.purchaseDate),
          type: 'فاتورة شراء',
          number: r.purchaseNumber,
          party: r.supplierName,
          description: r.description,
          amount: Number(r.amount || 0),
          status: r.status || '-',
          projectId: r.projectId
        });
      });

      // 3. Expenses
      const expWhere = [gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)];
      if (input.projectId) expWhere.push(eq(expenses.projectId, input.projectId));
      const expRows = await conn.select().from(expenses).where(and(...expWhere));

      expRows.forEach((r: any) => {
        if (input.expenseStatuses && !input.expenseStatuses.includes(r.status || '')) return;
        results.push({
          date: new Date(r.expenseDate),
          type: 'مصروف',
          number: '-',
          party: '-',
          description: `${r.category}: ${r.description}`,
          amount: Number(r.amount || 0),
          status: r.status || '-',
          projectId: r.projectId
        });
      });

      // 4. Installments
      const instWhere = [gte(installments.dueDate, from), lte(installments.dueDate, to)];
      if (input.projectId) instWhere.push(eq(installments.projectId, input.projectId));
      const instRows = await conn.select().from(installments).where(and(...instWhere));

      instRows.forEach((r: any) => {
        if (input.installmentStatuses && !input.installmentStatuses.includes(r.status || '')) return;
        results.push({
          date: new Date(r.dueDate),
          type: 'قسط',
          number: `Inst-${r.installmentNumber}`,
          party: '-',
          description: r.description || '-',
          amount: Number(r.amount || 0),
          status: r.status || '-',
          projectId: r.projectId
        });
      });

      // 5. Manual Sales
      const salesWhere = [gte(sales.saleDate, from), lte(sales.saleDate, to), isNull(sales.invoiceId)]; // Only manual sales
      if (input.projectId) salesWhere.push(eq(sales.projectId, input.projectId));
      const salesRows = await conn.select().from(sales).where(and(...salesWhere));

      salesRows.forEach((r: any) => {
        // Sales don't have explicit status filter input in current UI, assuming 'completed' or all if needed.
        // But usually we only care about completed sales.
        if (r.status !== 'completed') return;
        results.push({
          date: new Date(r.saleDate),
          type: 'بيع يدوي',
          number: r.saleNumber,
          party: '-', // Sales don't link to client table directly always, check schema. Schema says clientId is required.
          description: r.description,
          amount: Number(r.amount || 0),
          status: r.status || '-',
          projectId: r.projectId
        });
      });

      // Sort by date desc
      return results.sort((a, b) => b.date.getTime() - a.date.getTime());
    }),
});
