import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  expenses, boq, installments, sales, purchases,
  InsertExpense, InsertBOQ, InsertInstallment, InsertSale, InsertPurchase
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sum, sql, inArray } from "drizzle-orm";
import * as demo from "../_core/demoStore";

// Admin/Accountant procedure
const accountingProcedure = protectedProcedure
  .use(({ ctx, next }) => {
    if (process.env.NODE_ENV === 'production' && ctx.user.role !== 'admin' && ctx.user.role !== 'accountant' && ctx.user.role !== 'finance_manager') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Accounting access required' });
    }
    return next({ ctx });
  })
  .use(async ({ ctx, next }) => {
    const db = await getDb();
    if (!db) return next({ ctx });
    try {
      const permsRow = await db.select().from((await import("../../drizzle/schema")).userPermissions).where(eq((await import("../../drizzle/schema")).userPermissions.userId, ctx.user.id)).limit(1);
      const record = permsRow[0]?.permissionsJson ? JSON.parse(permsRow[0].permissionsJson) : {};
      if (record.hasOwnProperty('accounting') && !record['accounting']) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Section access denied' });
      }
    } catch { }
    return next({ ctx });
  });

// Admin/Finance Manager only - for mutations (accountant cannot modify directly)
const adminFinanceProcedure = accountingProcedure.use(({ ctx, next }) => {
  const allowedRoles = ['admin', 'finance_manager'];
  if (!allowedRoles.includes(ctx.user.role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'يجب رفع طلب للاعتماد - لا يمكنك التعديل مباشرة'
    });
  }
  return next({ ctx });
});

// Status values that lock an item from being edited/deleted
const LOCKED_STATUSES = ['approved', 'locked', 'paid'];

export const accountingRouter = router({
  // ============= EXPENSES =============
  expenses: router({
    list: accountingProcedure
      .input(z.object({
        projectId: z.number().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional()
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          let rows = demo.list("expenses").sort((a: any, b: any) => new Date(b.expenseDate || b.createdAt || 0).getTime() - new Date(a.expenseDate || a.createdAt || 0).getTime());
          if (input?.projectId) rows = rows.filter((r: any) => r.projectId === input.projectId);
          return rows;
        }

        let query = db.select().from(expenses).orderBy(desc(expenses.expenseDate));

        if (input?.projectId) {
          query = query.where(eq(expenses.projectId, input.projectId)) as any;
        }

        return await query;
      }),

    create: adminFinanceProcedure
      .input(z.object({
        projectId: z.number(),
        category: z.string(),
        description: z.string(),
        amount: z.number(),
        expenseDate: z.string()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.insert("expenses", {
            projectId: input.projectId,
            category: input.category,
            description: input.description,
            amount: input.amount,
            expenseDate: new Date(input.expenseDate),
          });
          return { success: true };
        }

        await db.insert(expenses).values({
          projectId: input.projectId,
          category: input.category,
          description: input.description,
          amount: input.amount,
          expenseDate: new Date(input.expenseDate),
          createdBy: 1 // TODO: use ctx.user.id
        });
        return { success: true };
      }),

    update: adminFinanceProcedure
      .input(z.object({
        id: z.number(),
        category: z.string().optional(),
        description: z.string().optional(),
        amount: z.number().optional(),
        expenseDate: z.string().optional(),
        status: z.enum(['active', 'processing', 'completed', 'cancelled']).optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const { id, expenseDate, ...data } = input as any;
          const updateData: any = { ...data };
          if (expenseDate) updateData.expenseDate = new Date(expenseDate);
          demo.update("expenses", id, updateData);
          return { success: true };
        }

        // State locking: check if item is locked/approved
        const [existing] = await db.select().from(expenses).where(eq(expenses.id, input.id)).limit(1);
        if (existing && LOCKED_STATUSES.includes(existing.status as string)) {
          // Allow unlocking if needed, or specific transitions? For now, we rely on LOCKED_STATUSES which includes 'approved', 'locked', 'paid'
          // 'completed' is NOT in LOCKED_STATUSES by default unless we add it.
          // Let's assume 'completed' is editable for now unless user requested locking.
        }

        const { id, expenseDate, ...data } = input;
        const updateData: any = { ...data };
        if (expenseDate) {
          updateData.expenseDate = new Date(expenseDate);
        }
        await db.update(expenses)
          .set(updateData)
          .where(eq(expenses.id, id));
        return { success: true };
      }),

    delete: adminFinanceProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.remove("expenses", input.id);
          return { success: true };
        }

        // State locking: check if item is locked/approved
        const [existing] = await db.select().from(expenses).where(eq(expenses.id, input.id)).limit(1);
        if (existing && LOCKED_STATUSES.includes(existing.status as string)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'لا يمكن حذف عنصر معتمد. قم بإلغاء الاعتماد أولاً.' });
        }

        await db.delete(expenses).where(eq(expenses.id, input.id));
        return { success: true };
      }),

    cancel: accountingProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.update("expenses", input.id, { status: "cancelled" });
          return { success: true };
        }
        await db.update(expenses).set({ status: 'cancelled' }).where(eq(expenses.id, input.id));
        return { success: true };
      }),

    summary: accountingProcedure
      .input(z.object({
        projectId: z.number().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional()
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          let rows = demo.list("expenses");
          if (input?.projectId) rows = rows.filter((r: any) => r.projectId === input.projectId);
          const totalAmount = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const count = rows.length;
          return { totalAmount, count };
        }

        let conditions = [];
        if (input?.projectId) conditions.push(eq(expenses.projectId, input.projectId));

        const result = await db.select({
          total: sum(expenses.amount),
          count: sql<number>`count(*)`
        }).from(expenses)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        return {
          totalAmount: Number(result[0]?.total || 0),
          count: Number(result[0]?.count || 0)
        };
      })
  }),

  // ============= BOQ (Bill of Quantities) =============
  boq: router({
    list: accountingProcedure
      .input(z.object({
        projectId: z.number().optional()
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          let rows = demo.list("boq").sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          if (input?.projectId) rows = rows.filter((r: any) => r.projectId === input.projectId);
          return rows;
        }

        let query = db.select().from(boq).orderBy(desc(boq.createdAt));

        if (input?.projectId) {
          query = query.where(eq(boq.projectId, input.projectId)) as any;
        }

        return await query;
      }),

    create: adminFinanceProcedure
      .input(z.object({
        projectId: z.number(),
        itemNumber: z.string(),
        description: z.string(),
        unit: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        category: z.string().optional(),
        notes: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const totalPrice = input.quantity * input.unitPrice;
          demo.insert("boq", {
            projectId: input.projectId,
            itemName: input.itemNumber,
            description: input.description,
            unit: input.unit,
            quantity: input.quantity,
            unitPrice: input.unitPrice,
            total: totalPrice,
            category: input.category,
          });
          return { success: true };
        }

        const totalPrice = input.quantity * input.unitPrice;

        await db.insert(boq).values({
          projectId: input.projectId,
          itemName: input.itemNumber,
          description: input.description,
          unit: input.unit,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          total: totalPrice,
          category: input.category
        });
        return { success: true };
      }),

    update: adminFinanceProcedure
      .input(z.object({
        id: z.number(),
        itemNumber: z.string().optional(),
        description: z.string().optional(),
        unit: z.string().optional(),
        quantity: z.number().optional(),
        unitPrice: z.number().optional(),
        category: z.string().optional(),
        notes: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const { id, ...data } = input as any;
          demo.update("boq", id, data);
          return { success: true };
        }

        const { id, ...data } = input;

        // Recalculate total if quantity or unitPrice changed
        let updateData: any = { ...data };
        if (data.quantity !== undefined || data.unitPrice !== undefined) {
          const [current] = await db.select().from(boq).where(eq(boq.id, id));
          const newQuantity = data.quantity ?? current.quantity;
          const newUnitPrice = data.unitPrice ?? current.unitPrice;
          updateData.total = newQuantity * newUnitPrice;
        }

        await db.update(boq)
          .set(updateData)
          .where(eq(boq.id, id));
        return { success: true };
      }),

    delete: adminFinanceProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.remove("boq", input.id);
          return { success: true };
        }

        await db.delete(boq).where(eq(boq.id, input.id));
        return { success: true };
      }),

    summary: accountingProcedure
      .input(z.object({
        projectId: z.number()
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const rows = demo.list("boq").filter((r: any) => r.projectId === input.projectId);
          const totalAmount = rows.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
          const itemCount = rows.length;
          return { totalAmount, itemCount };
        }

        const result = await db.select({
          total: sum(boq.total),
          count: sql<number>`count(*)`
        }).from(boq)
          .where(eq(boq.projectId, input.projectId));

        return {
          totalAmount: Number(result[0]?.total || 0),
          itemCount: Number(result[0]?.count || 0)
        };
      })
  }),

  // ============= INSTALLMENTS =============
  installments: router({
    list: accountingProcedure
      .input(z.object({
        projectId: z.number().optional(),
        status: z.enum(['pending', 'paid', 'overdue']).optional()
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          let rows = demo.list("installments");
          if (input?.projectId) rows = rows.filter((r: any) => r.projectId === input.projectId);
          if (input?.status) rows = rows.filter((r: any) => r.status === input.status);
          return rows.sort((a: any, b: any) => new Date(b.dueDate || b.createdAt || 0).getTime() - new Date(a.dueDate || a.createdAt || 0).getTime());
        }

        let conditions = [];

        if (input?.projectId) conditions.push(eq(installments.projectId, input.projectId));
        if (input?.status) conditions.push(eq(installments.status, input.status));

        return await db.select().from(installments)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(installments.dueDate));
      }),

    create: adminFinanceProcedure
      .input(z.object({
        projectId: z.number(),
        installmentNumber: z.number(),
        amount: z.number(),
        dueDate: z.number(),
        description: z.string().optional(),
        notes: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.insert("installments", {
            projectId: input.projectId,
            installmentNumber: input.installmentNumber,
            amount: input.amount,
            dueDate: new Date(input.dueDate),
            status: "pending",
            notes: input.notes,
          });
          return { success: true };
        }

        await db.insert(installments).values({
          projectId: input.projectId,
          installmentNumber: input.installmentNumber,
          amount: input.amount,
          dueDate: new Date(input.dueDate),
          status: 'pending',
          notes: input.notes
        });
        return { success: true };
      }),

    update: adminFinanceProcedure
      .input(z.object({
        id: z.number(),
        amount: z.number().optional(),
        dueDate: z.number().optional(),
        status: z.enum(['pending', 'paid', 'overdue']).optional(),
        paidDate: z.number().optional(),
        description: z.string().optional(),
        notes: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const { id, dueDate, paidDate, ...data } = input as any;
          const updateData: any = { ...data };
          if (dueDate) updateData.dueDate = new Date(dueDate);
          if (paidDate) updateData.paidDate = new Date(paidDate);
          demo.update("installments", id, updateData);
          return { success: true };
        }

        const { id, dueDate, paidDate, ...data } = input;
        const updateData: any = { ...data };
        if (dueDate) updateData.dueDate = new Date(dueDate);
        if (paidDate) updateData.paidDate = new Date(paidDate);

        await db.update(installments)
          .set(updateData)
          .where(eq(installments.id, id));

        return { success: true };
      }),

    markAsPaid: adminFinanceProcedure
      .input(z.object({
        id: z.number(),
        paidDate: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.update("installments", input.id, { status: "paid", paidDate: input.paidDate ? new Date(input.paidDate) : new Date() });
          return { success: true };
        }

        await db.update(installments)
          .set({
            status: 'paid',
            paidDate: input.paidDate ? new Date(input.paidDate) : new Date()
          })
          .where(eq(installments.id, input.id));

        return { success: true };
      }),

    delete: adminFinanceProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.remove("installments", input.id);
          return { success: true };
        }

        await db.delete(installments).where(eq(installments.id, input.id));
        return { success: true };
      }),

    cancel: adminFinanceProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.update("installments", input.id, { status: "cancelled" });
          return { success: true };
        }
        await db.update(installments).set({ status: 'cancelled' }).where(eq(installments.id, input.id));
        return { success: true };
      }),

    summary: accountingProcedure
      .input(z.object({
        projectId: z.number().optional()
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          let rows = demo.list("installments");
          if (input?.projectId) rows = rows.filter((r: any) => r.projectId === input.projectId);
          const totalAmount = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const paidAmount = rows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const pendingAmount = rows.filter((r: any) => r.status === "pending").reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const count = rows.length;
          return { totalAmount, paidAmount, pendingAmount, count };
        }

        const conditions = input?.projectId ? [eq(installments.projectId, input.projectId)] : [];

        const allResult = await db.select({
          total: sum(installments.amount),
          count: sql<number>`count(*)`
        }).from(installments)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        const paidResult = await db.select({
          total: sum(installments.amount)
        }).from(installments)
          .where(and(
            eq(installments.status, 'paid'),
            ...(conditions.length > 0 ? conditions : [])
          ));

        const pendingResult = await db.select({
          total: sum(installments.amount)
        }).from(installments)
          .where(and(
            eq(installments.status, 'pending'),
            ...(conditions.length > 0 ? conditions : [])
          ));

        return {
          totalAmount: Number(allResult[0]?.total || 0),
          paidAmount: Number(paidResult[0]?.total || 0),
          pendingAmount: Number(pendingResult[0]?.total || 0),
          count: Number(allResult[0]?.count || 0)
        };
      })
  }),

  // ============= SALES =============
  sales: router({
    list: accountingProcedure.query(async () => {
      const db = await getDb();
      if (!db) return demo.list("sales").sort((a: any, b: any) => new Date(b.saleDate || b.createdAt || 0).getTime() - new Date(a.saleDate || a.createdAt || 0).getTime());
      return await db.select().from(sales).orderBy(desc(sales.saleDate));
    }),

    create: adminFinanceProcedure
      .input(z.object({
        clientId: z.number(),
        projectId: z.number().optional(),
        description: z.string(),
        amount: z.number(),
        paymentMethod: z.enum(["cash", "bank_transfer", "check", "credit"]),
        saleDate: z.string(),
        invoiceId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          const saleNumber = `SAL-${Date.now()}`;
          demo.insert("sales", {
            saleNumber,
            ...input,
            saleDate: new Date(input.saleDate),
            createdBy: ctx.user.id,
            status: "completed",
          });
          return { success: true };
        }
        const saleNumber = `SAL-${Date.now()}`;
        await db.insert(sales).values({
          saleNumber,
          ...input,
          saleDate: new Date(input.saleDate),
          createdBy: ctx.user.id,
          status: 'completed',
        });
        return { success: true };
      }),

    cancel: adminFinanceProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.update("sales", input.id, { status: "cancelled" });
          return { success: true };
        }
        await db.update(sales)
          .set({ status: 'cancelled' })
          .where(eq(sales.id, input.id));
        return { success: true };
      }),

    update: adminFinanceProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number().optional(),
        description: z.string().optional(),
        amount: z.number().optional(),
        paymentMethod: z.enum(["cash", "bank_transfer", "check", "credit"]).optional(),
        saleDate: z.string().optional(),
        invoiceId: z.number().optional(),
        notes: z.string().optional(),
        status: z.enum(["pending", "completed", "cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const { id, saleDate, ...data } = input as any;
          const updateData: any = { ...data };
          if (saleDate) updateData.saleDate = new Date(saleDate);
          demo.update("sales", id, updateData);
          return { success: true };
        }
        const { id, saleDate, ...data } = input;
        const updateData: any = { ...data };
        if (saleDate) updateData.saleDate = new Date(saleDate);
        await db.update(sales)
          .set(updateData)
          .where(eq(sales.id, id));
        return { success: true };
      }),

    delete: adminFinanceProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.remove("sales", input.id);
          return { success: true };
        }
        await db.delete(sales).where(eq(sales.id, input.id));
        return { success: true };
      }),

    getTotalSales: accountingProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          let rows = demo.list("sales").filter((r: any) => (r.status || "completed") === "completed");
          if (input?.startDate) rows = rows.filter((r: any) => new Date(r.saleDate || r.createdAt || 0) >= new Date(input.startDate!));
          if (input?.endDate) rows = rows.filter((r: any) => new Date(r.saleDate || r.createdAt || 0) <= new Date(input.endDate!));
          const total = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const count = rows.length;
          return { total, count };
        }

        let conditions = [eq(sales.status, "completed")];
        if (input?.startDate) {
          conditions.push(sql`${sales.saleDate} >= ${new Date(input.startDate)}`);
        }
        if (input?.endDate) {
          conditions.push(sql`${sales.saleDate} <= ${new Date(input.endDate)}`);
        }

        const result = await db.select({
          total: sum(sales.amount),
          count: sql<number>`COUNT(*)`,
        }).from(sales).where(and(...conditions));

        return { total: Number(result[0]?.total || 0), count: Number(result[0]?.count || 0) };
      }),
  }),

  // ============= PURCHASES =============
  purchases: router({
    list: accountingProcedure.query(async () => {
      const db = await getDb();
      if (!db) return demo.list("purchases").sort((a: any, b: any) => new Date(b.purchaseDate || b.createdAt || 0).getTime() - new Date(a.purchaseDate || a.createdAt || 0).getTime());
      return await db.select().from(purchases).orderBy(desc(purchases.purchaseDate));
    }),

    create: adminFinanceProcedure
      .input(z.object({
        supplierId: z.number().optional(),
        supplierName: z.string(),
        projectId: z.number().optional(),
        description: z.string(),
        amount: z.number(),
        paymentMethod: z.enum(["cash", "bank_transfer", "check", "credit"]),
        purchaseDate: z.string(),
        category: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          const purchaseNumber = `PUR-${Date.now()}`;
          demo.insert("purchases", {
            purchaseNumber,
            ...input,
            purchaseDate: new Date(input.purchaseDate),
            createdBy: ctx.user.id,
            status: "completed",
          });
          return { success: true };
        }
        const purchaseNumber = `PUR-${Date.now()}`;
        await db.insert(purchases).values({
          purchaseNumber,
          ...input,
          purchaseDate: new Date(input.purchaseDate),
          createdBy: ctx.user.id,
          status: 'completed',
        });
        return { success: true };
      }),

    cancel: adminFinanceProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.update("purchases", input.id, { status: "cancelled" });
          return { success: true };
        }
        await db.update(purchases)
          .set({ status: 'cancelled' })
          .where(eq(purchases.id, input.id));
        return { success: true };
      }),

    update: adminFinanceProcedure
      .input(z.object({
        id: z.number(),
        supplierId: z.number().optional(),
        supplierName: z.string().optional(),
        projectId: z.number().optional(),
        description: z.string().optional(),
        amount: z.number().optional(),
        paymentMethod: z.enum(["cash", "bank_transfer", "check", "credit"]).optional(),
        purchaseDate: z.string().optional(),
        category: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["pending", "completed", "cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const { id, purchaseDate, ...data } = input as any;
          const updateData: any = { ...data };
          if (purchaseDate) updateData.purchaseDate = new Date(purchaseDate);
          demo.update("purchases", id, updateData);
          return { success: true };
        }
        const { id, purchaseDate, ...data } = input;
        const updateData: any = { ...data };
        if (purchaseDate) updateData.purchaseDate = new Date(purchaseDate);
        await db.update(purchases)
          .set(updateData)
          .where(eq(purchases.id, id));
        return { success: true };
      }),

    delete: adminFinanceProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          demo.remove("purchases", input.id);
          return { success: true };
        }
        await db.delete(purchases).where(eq(purchases.id, input.id));
        return { success: true };
      }),

    getTotalPurchases: accountingProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          let rows = demo.list("purchases").filter((r: any) => (r.status || "completed") === "completed");
          if (input?.startDate) rows = rows.filter((r: any) => new Date(r.purchaseDate || r.createdAt || 0) >= new Date(input.startDate!));
          if (input?.endDate) rows = rows.filter((r: any) => new Date(r.purchaseDate || r.createdAt || 0) <= new Date(input.endDate!));
          const total = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const count = rows.length;
          return { total, count };
        }

        let conditions = [eq(purchases.status, "completed")];
        if (input?.startDate) {
          conditions.push(sql`${purchases.purchaseDate} >= ${new Date(input.startDate)}`);
        }
        if (input?.endDate) {
          conditions.push(sql`${purchases.purchaseDate} <= ${new Date(input.endDate)}`);
        }

        const result = await db.select({
          total: sum(purchases.amount),
          count: sql<number>`COUNT(*)`,
        }).from(purchases).where(and(...conditions));

        return { total: Number(result[0]?.total || 0), count: Number(result[0]?.count || 0) };
      }),
  }),

  // ============= FINANCIAL REPORTS =============
  reports: router({
    projectFinancials: accountingProcedure
      .input(z.object({
        projectId: z.number()
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const expensesRows = demo.list("expenses").filter((r: any) => r.projectId === input.projectId);
          const boqRows = demo.list("boq").filter((r: any) => r.projectId === input.projectId);
          const instRows = demo.list("installments").filter((r: any) => r.projectId === input.projectId);
          const totalExpenses = expensesRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const totalBOQ = boqRows.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
          const totalRevenue = instRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const paidRevenue = instRows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          return {
            projectId: input.projectId,
            totalExpenses,
            totalBOQ,
            totalRevenue,
            paidRevenue,
            pendingRevenue: totalRevenue - paidRevenue,
            netProfit: paidRevenue - totalExpenses,
            profitMargin: paidRevenue > 0 ? ((paidRevenue - totalExpenses) / paidRevenue) * 100 : 0
          };
        }

        // Get project expenses
        const expensesResult = await db.select({
          total: sum(expenses.amount)
        }).from(expenses)
          .where(eq(expenses.projectId, input.projectId));

        // Get BOQ total
        const boqResult = await db.select({
          total: sum(boq.total)
        }).from(boq)
          .where(eq(boq.projectId, input.projectId));

        // Get installments
        const installmentsResult = await db.select({
          total: sum(installments.amount),
          paid: sql<number>`sum(case when ${installments.status} = 'paid' then ${installments.amount} else 0 end)`
        }).from(installments)
          .where(eq(installments.projectId, input.projectId));

        const totalExpenses = Number(expensesResult[0]?.total || 0);
        const totalBOQ = Number(boqResult[0]?.total || 0);
        const totalRevenue = Number(installmentsResult[0]?.total || 0);
        const paidRevenue = Number(installmentsResult[0]?.paid || 0);

        return {
          projectId: input.projectId,
          totalExpenses,
          totalBOQ,
          totalRevenue,
          paidRevenue,
          pendingRevenue: totalRevenue - paidRevenue,
          netProfit: paidRevenue - totalExpenses,
          profitMargin: paidRevenue > 0 ? ((paidRevenue - totalExpenses) / paidRevenue) * 100 : 0
        };
      }),

    overallFinancials: accountingProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) {
          const expensesRows = demo.list("expenses");
          const instRows = demo.list("installments");
          const invoicesRows = demo.list("invoices").filter((r: any) => r.status !== "cancelled");
          const purchasesRows = demo.list("purchases").filter((r: any) => (r.status || "completed") === "completed");
          const totalOperationalExpenses = expensesRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const totalPurchases = purchasesRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const totalExpenses = totalOperationalExpenses + totalPurchases;
          const installmentsRevenue = instRows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const invoicesRevenue = invoicesRows.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
          const totalRevenue = installmentsRevenue + invoicesRevenue;
          const paidRevenue = instRows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
            + invoicesRows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + Number(r.total || 0), 0);
          return {
            totalExpenses,
            totalOperationalExpenses,
            totalPurchases,
            totalRevenue,
            paidRevenue,
            pendingRevenue: totalRevenue - paidRevenue,
            netProfit: paidRevenue - totalExpenses,
            profitMargin: paidRevenue > 0 ? ((paidRevenue - totalExpenses) / paidRevenue) * 100 : 0
          };
        }

        const expensesResult = await db.select({ total: sum(expenses.amount) }).from(expenses).where(inArray(expenses.status, ['active', 'completed']));
        const purchasesRes = await db.select({ total: sum(purchases.amount) }).from(purchases).where(eq(purchases.status, 'completed'));
        const instRes = await db.select({
          total: sum(installments.amount),
          paid: sql<number>`sum(case when ${installments.status} = 'paid' then ${installments.amount} else 0 end)`
        }).from(installments);

        // Use invoices for revenue calculation
        const invoicesTable = (await import("../../drizzle/schema")).invoices;
        const invRes = await db.select({
          total: sum(invoicesTable.total),
          paid: sql<number>`sum(case when ${invoicesTable.status} = 'paid' then ${invoicesTable.total} else 0 end)`
        }).from(invoicesTable).where(ne(invoicesTable.status, 'cancelled'));

        const totalOperationalExpenses = Number(expensesResult[0]?.total || 0);
        const totalPurchases = Number(purchasesRes[0]?.total || 0);
        const totalExpenses = totalOperationalExpenses + totalPurchases;

        const totalRevenue = Number(instRes[0]?.total || 0) + Number(invRes[0]?.total || 0);
        const paidRevenue = Number(instRes[0]?.paid || 0) + Number(invRes[0]?.paid || 0);

        return {
          totalExpenses,
          totalOperationalExpenses,
          totalPurchases,
          totalRevenue,
          paidRevenue,
          pendingRevenue: totalRevenue - paidRevenue,
          netProfit: paidRevenue - totalExpenses,
          profitMargin: paidRevenue > 0 ? ((paidRevenue - totalExpenses) / paidRevenue) * 100 : 0
        };
      })
  })
});
