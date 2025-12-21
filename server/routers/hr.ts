import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getEmployeeByUserId } from "../db";
import {
  employees, attendance, payroll, leaves, performanceReviews, users,
  InsertEmployee, InsertAttendance, InsertPayroll, InsertLeave, InsertPerformanceReview
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// Admin-only procedure
const adminProcedure = protectedProcedure
  .use(({ ctx, next }) => {
    if (!['admin', 'hr_manager'].includes(ctx.user.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }
    return next({ ctx });
  })
  .use(async ({ ctx, next }) => {
    const db = await getDb();
    if (!db) return next({ ctx });
    try {
      const permsRow = await db.select().from((await import("../../drizzle/schema")).userPermissions).where(eq((await import("../../drizzle/schema")).userPermissions.userId, ctx.user.id)).limit(1);
      const record = permsRow[0]?.permissionsJson ? JSON.parse(permsRow[0].permissionsJson) : {};
      if (record.hasOwnProperty('hr') && !record['hr']) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Section access denied' });
      }
    } catch { }
    return next({ ctx });
  });

export const hrRouter = router({
  // ============= MY PROFILE (Self-Service for All Employees) =============
  myProfile: router({
    // Get current user's employee record
    get: protectedProcedure.query(async ({ ctx }) => {
      const emp = await getEmployeeByUserId(ctx.user.id);
      if (!emp) return null;
      return emp;
    }),

    // Get current user's attendance records
    myAttendance: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const emp = await getEmployeeByUserId(ctx.user.id);
        if (!emp) return [];

        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          let rows = demo.list("attendance").filter((r: any) => r.employeeId === emp.id);
          if (input.startDate) rows = rows.filter((r: any) => new Date(r.date) >= input.startDate!);
          if (input.endDate) rows = rows.filter((r: any) => new Date(r.date) <= input.endDate!);
          return rows.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        const conditions = [eq(attendance.employeeId, emp.id)];
        if (input.startDate) conditions.push(gte(attendance.date, input.startDate));
        if (input.endDate) conditions.push(lte(attendance.date, input.endDate));

        return await db.select().from(attendance).where(and(...conditions)).orderBy(desc(attendance.date));
      }),

    // Get current user's payroll records
    myPayroll: protectedProcedure.query(async ({ ctx }) => {
      const emp = await getEmployeeByUserId(ctx.user.id);
      if (!emp) return [];

      const db = await getDb();
      if (!db) {
        const demo = await import("../_core/demoStore");
        return demo.list("payroll").filter((r: any) => r.employeeId === emp.id);
      }

      return await db.select().from(payroll).where(eq(payroll.employeeId, emp.id)).orderBy(desc(payroll.createdAt));
    }),

    // Get current user's leave requests
    myLeaves: protectedProcedure.query(async ({ ctx }) => {
      const emp = await getEmployeeByUserId(ctx.user.id);
      if (!emp) return [];

      const db = await getDb();
      if (!db) {
        const demo = await import("../_core/demoStore");
        return demo.list("leaves").filter((r: any) => r.employeeId === emp.id);
      }

      return await db.select().from(leaves).where(eq(leaves.employeeId, emp.id)).orderBy(desc(leaves.createdAt));
    }),

    // Get current user's performance reviews
    myReviews: protectedProcedure.query(async ({ ctx }) => {
      const emp = await getEmployeeByUserId(ctx.user.id);
      if (!emp) return [];

      const db = await getDb();
      if (!db) {
        const demo = await import("../_core/demoStore");
        return demo.list("performanceReviews").filter((r: any) => r.employeeId === emp.id);
      }

      return await db.select().from(performanceReviews).where(eq(performanceReviews.employeeId, emp.id)).orderBy(desc(performanceReviews.reviewDate));
    }),

    // Request a new leave (self-service)
    requestLeave: protectedProcedure
      .input(z.object({
        leaveType: z.enum(['annual', 'sick', 'emergency', 'unpaid']),
        startDate: z.date(),
        endDate: z.date(),
        days: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const emp = await getEmployeeByUserId(ctx.user.id);
        if (!emp) throw new TRPCError({ code: 'FORBIDDEN', message: 'Employee record not found' });

        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.insert("leaves", { ...input, employeeId: emp.id, status: "pending" });
          return { success: true };
        }

        const values: InsertLeave = {
          ...input,
          employeeId: emp.id,
          status: 'pending'
        };

        await db.insert(leaves).values(values);

        // Notify admin and hr_manager about new leave request
        const { createNotificationForRoles } = await import('./notifications');
        const leaveTypes: Record<string, string> = {
          'annual': 'سنوية',
          'sick': 'مرضية',
          'emergency': 'طارئة',
          'unpaid': 'بدون راتب'
        };
        await createNotificationForRoles({
          roles: ['admin', 'hr_manager'],
          fromUserId: ctx.user.id,
          type: 'action',
          title: 'طلب إجازة جديد',
          message: `${ctx.user.name || 'موظف'} طلب إجازة ${leaveTypes[input.leaveType] || input.leaveType} لمدة ${input.days} يوم`,
          entityType: 'leave',
          link: '/hr'
        });

        return { success: true };
      }),
  }),

  // ============= EMPLOYEES =============
  employees: router({
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return (await import("../_core/demoStore")).list("employees");
      return await db.select().from(employees).orderBy(desc(employees.createdAt));
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          const emp = demo.findById("employees", input.id);
          if (!emp) throw new TRPCError({ code: 'NOT_FOUND' });
          return emp;
        }

        const result = await db.select().from(employees).where(eq(employees.id, input.id)).limit(1);
        if (result.length === 0) throw new TRPCError({ code: 'NOT_FOUND' });

        return result[0];
      }),

    create: adminProcedure
      .input(z.object({
        userId: z.number(),
        employeeNumber: z.string(),
        department: z.string().optional(),
        position: z.string().optional(),
        hireDate: z.date(),
        salary: z.number().optional(),
        bankAccount: z.string().optional(),
        emergencyContact: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.insert("employees", { ...input, status: "active" });
          return { success: true };
        }

        const values: InsertEmployee = {
          ...input,
          status: 'active'
        };

        await db.insert(employees).values(values);

        // Notify new employee about their account setup
        const { createNotification } = await import('./notifications');
        await createNotification({
          userId: input.userId,
          fromUserId: (ctx as any).user?.id,
          type: 'success',
          title: 'مرحباً بك في فريق العمل! 🎉',
          message: `تم إنشاء ملفك كموظف برقم ${input.employeeNumber}`,
          entityType: 'employee',
          link: '/hr'
        });

        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        department: z.string().optional(),
        position: z.string().optional(),
        salary: z.number().optional(),
        bankAccount: z.string().optional(),
        emergencyContact: z.string().optional(),
        status: z.enum(['active', 'on_leave', 'terminated']).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const { id, ...updateData } = input;
        await db.update(employees).set(updateData).where(eq(employees.id, id));

        return { success: true };
      }),

    getDetails: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        // Get employee with user data
        const employee = await db.select({
          employee: employees,
          user: users
        })
          .from(employees)
          .leftJoin(users, eq(employees.userId, users.id))
          .where(eq(employees.id, input.id))
          .limit(1);

        if (employee.length === 0) throw new TRPCError({ code: 'NOT_FOUND' });

        // Get related data
        const [recentAttendance, recentPayroll, activeLeaves, reviews] = await Promise.all([
          db.select().from(attendance)
            .where(eq(attendance.employeeId, input.id))
            .orderBy(desc(attendance.date))
            .limit(10),
          db.select().from(payroll)
            .where(eq(payroll.employeeId, input.id))
            .orderBy(desc(payroll.createdAt))
            .limit(6),
          db.select().from(leaves)
            .where(and(
              eq(leaves.employeeId, input.id),
              eq(leaves.status, 'approved')
            ))
            .orderBy(desc(leaves.startDate)),
          db.select().from(performanceReviews)
            .where(eq(performanceReviews.employeeId, input.id))
            .orderBy(desc(performanceReviews.reviewDate))
            .limit(5)
        ]);

        return {
          employee: employee[0].employee,
          user: employee[0].user,
          recentAttendance,
          recentPayroll,
          activeLeaves,
          reviews
        };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.remove("employees", input.id);
          return { success: true };
        }

        // Delete related records first
        await db.delete(attendance).where(eq(attendance.employeeId, input.id));
        await db.delete(payroll).where(eq(payroll.employeeId, input.id));
        await db.delete(leaves).where(eq(leaves.employeeId, input.id));
        await db.delete(performanceReviews).where(eq(performanceReviews.employeeId, input.id));

        // Delete employee
        await db.delete(employees).where(eq(employees.id, input.id));
        return { success: true };
      }),
  }),

  // ============= ATTENDANCE =============
  attendance: router({
    list: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          let rows = demo.list("attendance");
          if (input.employeeId) rows = rows.filter((r: any) => r.employeeId === input.employeeId);
          if (input.startDate) rows = rows.filter((r: any) => new Date(r.date) >= input.startDate!);
          if (input.endDate) rows = rows.filter((r: any) => new Date(r.date) <= input.endDate!);
          return rows.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        let query = db.select().from(attendance);

        const conditions = [];
        if (input.employeeId) conditions.push(eq(attendance.employeeId, input.employeeId));
        if (input.startDate) conditions.push(gte(attendance.date, input.startDate));
        if (input.endDate) conditions.push(lte(attendance.date, input.endDate));

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }

        return await query.orderBy(desc(attendance.date));
      }),

    checkIn: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        date: z.date(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.insert("attendance", { employeeId: input.employeeId, date: input.date, checkIn: new Date(), status: "present" });
          return { success: true };
        }

        const values: InsertAttendance = {
          employeeId: input.employeeId,
          date: input.date,
          checkIn: new Date(),
          status: 'present'
        };

        await db.insert(attendance).values(values);
        return { success: true };
      }),

    checkOut: protectedProcedure
      .input(z.object({
        id: z.number(),
        checkOut: z.date(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          const rec = demo.findById("attendance", input.id) as any;
          const checkIn = rec?.checkIn ? new Date(rec.checkIn) : null;
          const hoursWorked = checkIn ? Math.floor((input.checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)) : 0;
          demo.update("attendance", input.id, { checkOut: input.checkOut, hoursWorked });
          return { success: true, hoursWorked };
        }

        // Calculate hours worked
        const record = await db.select().from(attendance).where(eq(attendance.id, input.id)).limit(1);
        if (record.length === 0) throw new TRPCError({ code: 'NOT_FOUND' });

        const checkIn = record[0].checkIn;
        const hoursWorked = checkIn ? Math.floor((input.checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)) : 0;

        await db.update(attendance)
          .set({ checkOut: input.checkOut, hoursWorked })
          .where(eq(attendance.id, input.id));

        return { success: true, hoursWorked };
      }),

    getSummary: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        month: z.number(),
        year: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          return {
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            lateDays: 0,
            totalHours: 0,
            averageHours: 0
          };
        }

        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 0);

        const records = await db.select()
          .from(attendance)
          .where(and(
            eq(attendance.employeeId, input.employeeId),
            gte(attendance.date, startDate),
            lte(attendance.date, endDate)
          ));

        const totalDays = records.length;
        const presentDays = records.filter(r => r.status === 'present').length;
        const absentDays = records.filter(r => r.status === 'absent').length;
        const lateDays = records.filter(r => r.status === 'late').length;
        const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

        return {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          totalHours,
          averageHours: totalDays > 0 ? totalHours / totalDays : 0
        };
      }),
    importCsv: protectedProcedure
      .input(z.object({
        csvData: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const settingsRows = await db.select().from((await import("../../drizzle/schema")).companySettings);
        const getSetting = (k: string, d: string) => {
          const f = settingsRows.find((it: any) => it.settingKey === k);
          const v = f?.settingValue;
          return (typeof v === "string" && v) ? v : d;
        };
        const shiftStart = getSetting("hrShiftStart", "09:00");
        const graceMinutes = parseInt(getSetting("hrShiftGraceMinutes", "15"));
        const lines = input.csvData.trim().split(/\r?\n/);
        if (lines.length < 2) return { success: true, created: 0, late: 0, absent: 0 };
        const [header, ...rows] = lines;
        const cols = header.split(",").map(s => s.trim().toLowerCase());
        const idxEmp = cols.indexOf("employeenumber");
        const idxDate = cols.indexOf("date");
        const idxIn = cols.indexOf("checkin");
        const idxOut = cols.indexOf("checkout");
        if (idxEmp < 0 || idxDate < 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'CSV must include employeeNumber,date[,checkIn,checkOut]' });
        }
        const employeesRows = await db.select().from((await import("../../drizzle/schema")).employees);
        const empByNumber = new Map<string, any>();
        employeesRows.forEach(e => empByNumber.set((e as any).employeeNumber, e));
        let created = 0, late = 0, absent = 0;
        const toTime = (dateStr: string, hm: string) => {
          const [h, m] = hm.split(":").map(x => parseInt(x));
          const d = new Date(dateStr);
          d.setHours(h, m, 0, 0);
          return d;
        };
        for (const r of rows) {
          if (!r.trim()) continue;
          const parts = r.split(",").map(s => s.trim());
          const empNumber = parts[idxEmp];
          const dateStr = parts[idxDate];
          const emp = empByNumber.get(empNumber);
          if (!emp) continue;
          const checkInStr = idxIn >= 0 ? parts[idxIn] : "";
          const checkOutStr = idxOut >= 0 ? parts[idxOut] : "";
          const date = new Date(dateStr);
          const plannedStart = toTime(dateStr, shiftStart);
          const graceMs = graceMinutes * 60 * 1000;
          let status: "present" | "late" | "absent" | "half_day" = "present";
          let checkIn: Date | null = null;
          let checkOut: Date | null = null;
          if (checkInStr) {
            const [ih, im] = checkInStr.split(":").map(x => parseInt(x));
            checkIn = new Date(date);
            checkIn.setHours(ih, im, 0, 0);
          }
          if (checkOutStr) {
            const [oh, om] = checkOutStr.split(":").map(x => parseInt(x));
            checkOut = new Date(date);
            checkOut.setHours(oh, om, 0, 0);
          }
          if (!checkIn) {
            status = "absent";
            absent++;
          } else if ((checkIn.getTime() - plannedStart.getTime()) > graceMs) {
            status = "late";
            late++;
          }
          let hoursWorked = 0;
          if (checkIn && checkOut) {
            hoursWorked = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60));
          }
          await db.insert((await import("../../drizzle/schema")).attendance).values({
            employeeId: emp.id,
            date,
            checkIn: checkIn || undefined,
            checkOut: checkOut || undefined,
            hoursWorked,
            status,
            notes: ""
          } as any);
          created++;
        }
        return { success: true, created, late, absent };
      }),
  }),

  // ============= PAYROLL =============
  payroll: router({
    list: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        year: z.number().optional(),
        month: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          let rows = demo.list("payroll");
          if (input.employeeId) rows = rows.filter((r: any) => r.employeeId === input.employeeId);
          if (input.year) rows = rows.filter((r: any) => r.year === input.year);
          if (input.month) rows = rows.filter((r: any) => r.month === input.month);
          return rows.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        }

        let query = db.select().from(payroll);

        const conditions = [];
        if (input.employeeId) conditions.push(eq(payroll.employeeId, input.employeeId));
        if (input.year) conditions.push(eq(payroll.year, input.year));
        if (input.month) conditions.push(eq(payroll.month, input.month));

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }

        return await query.orderBy(desc(payroll.createdAt));
      }),

    create: adminProcedure
      .input(z.object({
        employeeId: z.number(),
        month: z.number(),
        year: z.number(),
        baseSalary: z.number(),
        bonuses: z.number().optional(),
        deductions: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          const netSalary = input.baseSalary + (input.bonuses || 0) - (input.deductions || 0);
          demo.insert("payroll", { ...input, netSalary, status: "pending", createdBy: 0 });
          return { success: true, netSalary };
        }

        const bonuses = input.bonuses || 0;
        const deductions = input.deductions || 0;
        const netSalary = input.baseSalary + bonuses - deductions;

        const values: InsertPayroll = {
          ...input,
          bonuses,
          deductions,
          netSalary,
          status: 'pending',
          createdBy: ctx.user.id
        };

        await db.insert(payroll).values(values);

        // Get employee's userId and notify them about the payroll
        const emp = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
        if (emp[0]?.userId) {
          const { createNotification } = await import('./notifications');
          const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
          await createNotification({
            userId: emp[0].userId,
            fromUserId: ctx.user.id,
            type: 'success',
            title: 'تم صرف الراتب 💰',
            message: `تم إضافة راتب ${monthNames[input.month - 1] || input.month}/${input.year} بقيمة ${netSalary.toLocaleString()} ريال`,
            entityType: 'payroll',
            link: '/hr'
          });
        }

        return { success: true, netSalary };
      }),

    markPaid: adminProcedure
      .input(z.object({
        id: z.number(),
        paymentDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.update("payroll", input.id, { status: "paid", paymentDate: input.paymentDate });
          return { success: true };
        }

        await db.update(payroll)
          .set({ status: 'paid', paymentDate: input.paymentDate })
          .where(eq(payroll.id, input.id));

        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'paid']).optional(),
        paymentDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };
        const { id, ...data } = input;
        await db.update(payroll)
          .set(data)
          .where(eq(payroll.id, id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.remove("payroll", input.id);
          return { success: true };
        }
        await db.delete(payroll).where(eq(payroll.id, input.id));
        return { success: true };
      }),

    generatePayslip: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        // Get payroll record with employee and user data
        const result = await db.select({
          payroll: payroll,
          employee: employees,
          user: users
        })
          .from(payroll)
          .leftJoin(employees, eq(payroll.employeeId, employees.id))
          .leftJoin(users, eq(employees.userId, users.id))
          .where(eq(payroll.id, input.id))
          .limit(1);

        if (result.length === 0) throw new TRPCError({ code: 'NOT_FOUND' });

        return result[0];
      }),
  }),

  // ============= LEAVES =============
  leaves: router({
    list: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          let rows = demo.list("leaves");
          if (input.employeeId) rows = rows.filter((r: any) => r.employeeId === input.employeeId);
          if (input.status) rows = rows.filter((r: any) => r.status === input.status);
          return rows.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        }

        let query = db.select().from(leaves);

        const conditions = [];
        if (input.employeeId) conditions.push(eq(leaves.employeeId, input.employeeId));
        if (input.status) conditions.push(eq(leaves.status, input.status));

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }

        return await query.orderBy(desc(leaves.createdAt));
      }),

    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        leaveType: z.enum(['annual', 'sick', 'emergency', 'unpaid']),
        startDate: z.date(),
        endDate: z.date(),
        days: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.insert("leaves", { ...input, status: "pending" });
          return { success: true };
        }

        const values: InsertLeave = {
          ...input,
          status: 'pending'
        };

        await db.insert(leaves).values(values);

        // Get employee info for notification
        const emp = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
        const empName = emp[0] ? `الموظف #${emp[0].employeeNumber}` : `موظف`;

        // Notify admin and hr_manager about new leave request
        const { createNotificationForRoles } = await import('./notifications');
        const leaveTypes: Record<string, string> = {
          'annual': 'سنوية',
          'sick': 'مرضية',
          'emergency': 'طارئة',
          'unpaid': 'بدون راتب'
        };
        const startDateStr = input.startDate.toLocaleDateString('ar-EG');
        const endDateStr = input.endDate.toLocaleDateString('ar-EG');

        await createNotificationForRoles({
          roles: ['admin', 'hr_manager'],
          fromUserId: ctx.user.id,
          type: 'action',
          title: 'طلب إجازة جديد 📅',
          message: `${empName} طلب إجازة ${leaveTypes[input.leaveType] || input.leaveType} من ${startDateStr} إلى ${endDateStr} (${input.days} يوم)`,
          entityType: 'leave',
          link: '/hr'
        });

        return { success: true };
      }),

    approve: adminProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.update("leaves", input.id, { status: "approved", approvedBy: 0, approvedAt: new Date(), notes: input.notes });
          return { success: true };
        }

        // Get leave record to find employee and user
        const leaveRecord = await db.select().from(leaves).where(eq(leaves.id, input.id)).limit(1);

        await db.update(leaves)
          .set({
            status: 'approved',
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
            notes: input.notes
          })
          .where(eq(leaves.id, input.id));

        // Notify employee about approval
        if (leaveRecord[0]) {
          const emp = await db.select().from(employees).where(eq(employees.id, leaveRecord[0].employeeId)).limit(1);
          if (emp[0]?.userId) {
            const { createNotification } = await import('./notifications');
            await createNotification({
              userId: emp[0].userId,
              fromUserId: ctx.user.id,
              type: 'success',
              title: 'تمت الموافقة على طلب الإجازة ✅',
              message: input.notes ? `ملاحظات: ${input.notes}` : 'تم قبول طلب إجازتك',
              entityType: 'leave',
              entityId: input.id,
              link: '/hr'
            });
          }
        }

        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.update("leaves", input.id, { status: "rejected", approvedBy: 0, approvedAt: new Date(), notes: input.notes ?? input.reason });
          return { success: true };
        }

        // Get leave record to find employee and user
        const leaveRecord = await db.select().from(leaves).where(eq(leaves.id, input.id)).limit(1);

        await db.update(leaves)
          .set({
            status: 'rejected',
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
            notes: input.notes ?? input.reason
          })
          .where(eq(leaves.id, input.id));

        // Notify employee about rejection
        if (leaveRecord[0]) {
          const emp = await db.select().from(employees).where(eq(employees.id, leaveRecord[0].employeeId)).limit(1);
          if (emp[0]?.userId) {
            const { createNotification } = await import('./notifications');
            await createNotification({
              userId: emp[0].userId,
              fromUserId: ctx.user.id,
              type: 'warning',
              title: 'تم رفض طلب الإجازة ❌',
              message: input.notes || input.reason || 'تم رفض طلب إجازتك',
              entityType: 'leave',
              entityId: input.id,
              link: '/hr'
            });
          }
        }

        return { success: true };
      }),
  }),

  // ============= PERFORMANCE REVIEWS =============
  reviews: router({
    list: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          let rows = demo.list("performanceReviews");
          if (input.employeeId) rows = rows.filter((r: any) => r.employeeId === input.employeeId);
          return rows.sort((a: any, b: any) => new Date(b.reviewDate || b.createdAt || 0).getTime() - new Date(a.reviewDate || a.createdAt || 0).getTime());
        }

        let query = db.select().from(performanceReviews);

        if (input.employeeId) {
          query = query.where(eq(performanceReviews.employeeId, input.employeeId)) as any;
        }

        return await query.orderBy(desc(performanceReviews.reviewDate));
      }),

    create: adminProcedure
      .input(z.object({
        employeeId: z.number(),
        reviewDate: z.date(),
        period: z.string().optional(),
        rating: z.number().optional(),
        strengths: z.string().optional(),
        weaknesses: z.string().optional(),
        goals: z.string().optional(),
        comments: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.insert("performanceReviews", { ...input, reviewerId: 0 });
          return { success: true };
        }

        const values: InsertPerformanceReview = {
          ...input,
          reviewerId: ctx.user.id
        };

        await db.insert(performanceReviews).values(values);

        // Get employee's userId and notify them about the review
        const emp = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
        if (emp[0]?.userId) {
          const { createNotification } = await import('./notifications');
          await createNotification({
            userId: emp[0].userId,
            fromUserId: ctx.user.id,
            type: 'info',
            title: 'تقييم أداء جديد 📋',
            message: `تم إضافة تقييم أداء جديد لك${input.period ? ` - الفترة: ${input.period}` : ''}`,
            entityType: 'performance_review',
            link: '/hr'
          });
        }

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.remove("performanceReviews", input.id);
          return { success: true };
        }
        await db.delete(performanceReviews).where(eq(performanceReviews.id, input.id));
        return { success: true };
      }),
  }),
});
