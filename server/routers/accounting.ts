import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { 
  expenses, boq, installments, sales, purchases,
  InsertExpense, InsertBOQ, InsertInstallment, InsertSale, InsertPurchase
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sum, sql } from "drizzle-orm";

// Admin/Accountant procedure
const accountingProcedure = protectedProcedure
  .use(({ ctx, next }) => {
    if (ctx.user.role !== 'admin' && ctx.user.role !== 'accountant') {
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
    } catch {}
    return next({ ctx });
  });

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
        if (!db) return [];
        
        let query = db.select().from(expenses).orderBy(desc(expenses.expenseDate));
        
        if (input?.projectId) {
          query = query.where(eq(expenses.projectId, input.projectId)) as any;
        }
        
        return await query;
      }),

    create: accountingProcedure
      .input(z.object({
        projectId: z.number(),
        category: z.string(),
        description: z.string(),
        amount: z.number(),
        expenseDate: z.string()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        
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

    update: accountingProcedure
      .input(z.object({
        id: z.number(),
        category: z.string().optional(),
        description: z.string().optional(),
        amount: z.number().optional(),
        expenseDate: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        
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

    delete: accountingProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        
        await db.delete(expenses).where(eq(expenses.id, input.id));
        return { success: true };
      }),
    
    cancel: accountingProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
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
        if (!db) return { totalAmount: 0, count: 0 };
        
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
        if (!db) return [];
        
        let query = db.select().from(boq).orderBy(desc(boq.createdAt));
        
        if (input?.projectId) {
          query = query.where(eq(boq.projectId, input.projectId)) as any;
        }
        
        return await query;
      }),

    create: accountingProcedure
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
        if (!db) return { success: true };
        
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

    update: accountingProcedure
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
        if (!db) return { success: true };
        
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

    delete: accountingProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        
        await db.delete(boq).where(eq(boq.id, input.id));
        return { success: true };
      }),

    summary: accountingProcedure
      .input(z.object({
        projectId: z.number()
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { totalAmount: 0, itemCount: 0 };
        
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
        if (!db) return [];
        
        let conditions = [];
        
        if (input?.projectId) conditions.push(eq(installments.projectId, input.projectId));
        if (input?.status) conditions.push(eq(installments.status, input.status));
        
        return await db.select().from(installments)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(installments.dueDate));
      }),

    create: accountingProcedure
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
        if (!db) return { success: true };
        
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

    update: accountingProcedure
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
        if (!db) return { success: true };
        
        const { id, dueDate, paidDate, ...data } = input;
        const updateData: any = { ...data };
        if (dueDate) updateData.dueDate = new Date(dueDate);
        if (paidDate) updateData.paidDate = new Date(paidDate);
        
        await db.update(installments)
          .set(updateData)
          .where(eq(installments.id, id));
        
        return { success: true };
      }),

    markAsPaid: accountingProcedure
      .input(z.object({
        id: z.number(),
        paidDate: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        
        await db.update(installments)
          .set({
            status: 'paid',
            paidDate: input.paidDate ? new Date(input.paidDate) : new Date()
          })
          .where(eq(installments.id, input.id));
        
        return { success: true };
      }),

    delete: accountingProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        
        await db.delete(installments).where(eq(installments.id, input.id));
        return { success: true };
      }),
    
    cancel: accountingProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        await db.update(installments).set({ status: 'cancelled' }).where(eq(installments.id, input.id));
        return { success: true };
      }),

    summary: accountingProcedure
      .input(z.object({
        projectId: z.number().optional()
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { totalAmount: 0, paidAmount: 0, pendingAmount: 0, count: 0 };
        
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
      if (!db) return [];
      return await db.select().from(sales).orderBy(desc(sales.saleDate));
    }),

    create: accountingProcedure
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
        if (!db) return { success: true };
        const saleNumber = `SAL-${Date.now()}`;
        await db.insert(sales).values({
          saleNumber,
          ...input,
          saleDate: new Date(input.saleDate),
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),

    cancel: accountingProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        await db.update(sales)
          .set({ status: 'cancelled' })
          .where(eq(sales.id, input.id));
        return { success: true };
      }),
    
    update: accountingProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number().optional(),
        description: z.string().optional(),
        amount: z.number().optional(),
        paymentMethod: z.enum(["cash", "bank_transfer", "check", "credit"]).optional(),
        saleDate: z.string().optional(),
        invoiceId: z.number().optional(),
        notes: z.string().optional(),
        status: z.enum(["pending","completed","cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        const { id, saleDate, ...data } = input;
        const updateData: any = { ...data };
        if (saleDate) updateData.saleDate = new Date(saleDate);
        await db.update(sales)
          .set(updateData)
          .where(eq(sales.id, id));
        return { success: true };
      }),
    
    delete: accountingProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
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
        if (!db) return { total: 0, count: 0 };
        
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
      if (!db) return [];
      return await db.select().from(purchases).orderBy(desc(purchases.purchaseDate));
    }),

    create: accountingProcedure
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
        if (!db) return { success: true };
        const purchaseNumber = `PUR-${Date.now()}`;
        await db.insert(purchases).values({
          purchaseNumber,
          ...input,
          purchaseDate: new Date(input.purchaseDate),
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),

    cancel: accountingProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        await db.update(purchases)
          .set({ status: 'cancelled' })
          .where(eq(purchases.id, input.id));
        return { success: true };
      }),
    
    update: accountingProcedure
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
        status: z.enum(["pending","completed","cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        const { id, purchaseDate, ...data } = input;
        const updateData: any = { ...data };
        if (purchaseDate) updateData.purchaseDate = new Date(purchaseDate);
        await db.update(purchases)
          .set(updateData)
          .where(eq(purchases.id, id));
        return { success: true };
      }),
    
    delete: accountingProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
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
        if (!db) return { total: 0, count: 0 };
        
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
        if (!db) return {
          projectId: input.projectId,
          totalExpenses: 0,
          totalBOQ: 0,
          totalRevenue: 0,
          paidRevenue: 0,
          pendingRevenue: 0,
          netProfit: 0,
          profitMargin: 0
        };
        
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
        if (!db) return {
          totalExpenses: 0,
          totalRevenue: 0,
          paidRevenue: 0,
          pendingRevenue: 0,
          netProfit: 0,
          profitMargin: 0
        };
        
        // Total expenses
        const expensesResult = await db.select({
          total: sum(expenses.amount)
        }).from(expenses);
        
        // Total revenue from installments
        const revenueResult = await db.select({
          total: sum(installments.amount),
          paid: sql<number>`sum(case when ${installments.status} = 'paid' then ${installments.amount} else 0 end)`
        }).from(installments);
        
        const totalExpenses = Number(expensesResult[0]?.total || 0);
        const totalRevenue = Number(revenueResult[0]?.total || 0);
        const paidRevenue = Number(revenueResult[0]?.paid || 0);
        
        return {
          totalExpenses,
          totalRevenue,
          paidRevenue,
          pendingRevenue: totalRevenue - paidRevenue,
          netProfit: paidRevenue - totalExpenses,
          profitMargin: paidRevenue > 0 ? ((paidRevenue - totalExpenses) / paidRevenue) * 100 : 0
        };
      })
  })
});
