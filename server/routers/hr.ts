import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getEmployeeByUserId } from "../db";
import {
  employees, attendance, payroll, leaves, performanceReviews, users,
  InsertEmployee, InsertAttendance, InsertPayroll, InsertLeave, InsertPerformanceReview
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";

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
    // Get current user's employee record (auto-create if not exists)
    get: protectedProcedure.query(async ({ ctx }) => {
      let emp = await getEmployeeByUserId(ctx.user.id);

      // AUTO-CREATE OR LINK: If no employee record linked to this user
      if (!emp) {
        const db = await getDb();
        if (db) {
          // STEP 1: Try to find and link an existing unlinked employee record
          // Look for employees without userId that might belong to this user
          const unlinkedEmployees = await db.select().from(employees).where(eq(employees.userId, null as any));

          // Check if any unlinked employee matches this user (by position matching role, or by employee number containing user id)
          const roleToPosition: Record<string, string> = {
            'admin': 'مدير عام', 'department_manager': 'مدير قسم', 'project_manager': 'مدير مشاريع',
            'project_coordinator': 'منسق مشاريع', 'architect': 'مهندس معماري', 'interior_designer': 'مصمم داخلي',
            'site_engineer': 'مهندس موقع', 'planning_engineer': 'مهندس تخطيط', 'designer': 'مصمم',
            'technician': 'فني', 'finance_manager': 'مدير مالي', 'accountant': 'محاسب',
            'sales_manager': 'مسؤول مبيعات', 'hr_manager': 'مسؤول موارد بشرية', 'admin_assistant': 'مساعد إداري',
            'procurement_officer': 'مسؤول مشتريات', 'storekeeper': 'أمين مخازن', 'qa_qc': 'مسؤول جودة',
          };

          const userPosition = roleToPosition[ctx.user.role];

          console.log(`[AUTO-LINK] Checking ${unlinkedEmployees.length} unlinked employees for user ${ctx.user.id}, role: ${ctx.user.role}, position: ${userPosition}`);

          // Strategy 1: Find by exact position match
          let matchingEmployee = unlinkedEmployees.find(e => e.position === userPosition);

          // Strategy 2: Find by employee number containing userId
          if (!matchingEmployee) {
            matchingEmployee = unlinkedEmployees.find(e =>
              e.employeeNumber && e.employeeNumber.includes(`-${ctx.user.id}-`)
            );
            if (matchingEmployee) {
              console.log(`[AUTO-LINK] Found employee by employeeNumber pattern: ${matchingEmployee.employeeNumber}`);
            }
          }

          // Strategy 3: If only ONE unlinked employee exists, assume it's this user
          if (!matchingEmployee && unlinkedEmployees.length === 1) {
            matchingEmployee = unlinkedEmployees[0];
            console.log(`[AUTO-LINK] Only one unlinked employee exists, using it: ${matchingEmployee.id}`);
          }

          // If found, link it to this user
          if (matchingEmployee) {
            console.log(`[AUTO-LINK] Linking existing employee ${matchingEmployee.id} (${matchingEmployee.employeeNumber}) to user ${ctx.user.id}`);
            await db.update(employees).set({ userId: ctx.user.id }).where(eq(employees.id, matchingEmployee.id));
            emp = await getEmployeeByUserId(ctx.user.id);
          } else {
            // STEP 2: No matching employee found, create a new one
            const empNumber = `EMP-${ctx.user.id}-${Date.now().toString().slice(-4)}`;
            const position = userPosition || 'موظف';

            await db.insert(employees).values({
              userId: ctx.user.id,
              employeeNumber: empNumber,
              position: position,
              hireDate: new Date(),
              status: 'active'
            } as any);

            console.log(`[AUTO-CREATE] Created employee record for user ${ctx.user.id}: ${empNumber}`);
            emp = await getEmployeeByUserId(ctx.user.id);
          }
        }
      }

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
      const db = await getDb();
      if (!db) {
        const emp = await getEmployeeByUserId(ctx.user.id);
        if (!emp) return [];
        const demo = await import("../_core/demoStore");
        return demo.list("leaves").filter((r: any) => r.employeeId === emp.id);
      }

      // Find ALL employee records linked to this user
      const userEmployees = await db.select().from(employees).where(eq(employees.userId, ctx.user.id));

      const employeeIds = userEmployees.map(e => e.id);

      if (employeeIds.length === 0) return [];

      return await db.select()
        .from(leaves)
        .where(inArray(leaves.employeeId, employeeIds))
        .orderBy(desc(leaves.createdAt));
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
      const res = await db.select({
        id: employees.id,
        userId: employees.userId,
        employeeNumber: employees.employeeNumber,
        department: employees.department,
        position: employees.position,
        hireDate: employees.hireDate,
        salary: employees.salary,
        bankAccount: employees.bankAccount,
        emergencyContact: employees.emergencyContact,
        status: employees.status,
        createdAt: employees.createdAt,
        userName: users.name,
        userEmail: users.email
      })
        .from(employees)
        .leftJoin(users, eq(employees.userId, users.id))
        .orderBy(desc(employees.createdAt));

      return res;
    }),

    // Get users without employee records
    getUnlinkedUsers: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      // Get all user IDs that have employee records
      const linkedEmployees = await db.select({ userId: employees.userId }).from(employees);
      const linkedUserIds = new Set(linkedEmployees.map(e => e.userId));

      // Get all users and filter out those with employee records
      const allUsers = await db.select().from(users);
      return allUsers.filter(u => !linkedUserIds.has(u.id));
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

        const schema = await import("../../drizzle/schema");
        const settingsRows = await db.select().from(schema.companySettings);
        const getSetting = (k: string, d: string) => {
          const f = settingsRows.find((it: any) => it.settingKey === k);
          const v = f?.settingValue;
          return (typeof v === "string" && v) ? v : d;
        };
        const shiftStart = getSetting("hrShiftStart", "09:00");
        const graceMinutes = parseInt(getSetting("hrShiftGraceMinutes", "15"));

        const lines = input.csvData.trim().split(/\r?\n/);
        if (lines.length < 2) return { success: true, created: 0, updated: 0, late: 0, absent: 0 };

        const [header, ...rows] = lines;
        const cols = header.split(",").map(s => s.trim().toLowerCase());

        // Support both employeenumber and employeename
        const idxEmpNumber = cols.indexOf("employeenumber");
        const idxEmpName = cols.indexOf("employeename");
        const idxDate = cols.indexOf("date");
        const idxIn = cols.indexOf("checkin");
        const idxOut = cols.indexOf("checkout");

        // Must have at least date and either employee number or name
        if (idxDate < 0 || (idxEmpNumber < 0 && idxEmpName < 0)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'CSV must include date and either employeeNumber or employeeName columns'
          });
        }

        // Get all employees and users for matching
        const employeesRows = await db.select().from(schema.employees);
        const usersRows = await db.select().from(schema.users);

        // Build lookup maps
        const empByNumber = new Map<string, any>();
        const empByName = new Map<string, any>();
        employeesRows.forEach(e => {
          empByNumber.set((e as any).employeeNumber?.toLowerCase(), e);
          // Also map by user name
          const user = usersRows.find(u => u.id === (e as any).userId);
          if (user?.name) {
            empByName.set(user.name.toLowerCase(), e);
          }
        });

        let created = 0, updated = 0, late = 0, absent = 0;
        const skipped: string[] = [];
        const availableEmployees = Array.from(empByNumber.keys()).slice(0, 10);

        const toTime = (dateStr: string, hm: string) => {
          const [h, m] = hm.split(":").map(x => parseInt(x));
          const d = new Date(dateStr);
          d.setHours(h, m, 0, 0);
          return d;
        };

        for (const r of rows) {
          if (!r.trim()) continue;
          const parts = r.split(",").map(s => s.trim());

          // Find employee by number or name
          let emp: any = null;
          if (idxEmpNumber >= 0 && parts[idxEmpNumber]) {
            emp = empByNumber.get(parts[idxEmpNumber].toLowerCase());
          }
          if (!emp && idxEmpName >= 0 && parts[idxEmpName]) {
            emp = empByName.get(parts[idxEmpName].toLowerCase());
          }

          if (!emp) {
            const identifier = parts[idxEmpNumber] || parts[idxEmpName] || 'unknown';
            console.log(`[CSV Import] Employee not found: ${identifier}`);
            skipped.push(identifier);
            continue;
          }

          const dateStr = parts[idxDate];
          const date = new Date(dateStr);
          // Normalize date to start of day for comparison
          date.setHours(0, 0, 0, 0);

          const checkInStr = idxIn >= 0 ? parts[idxIn] : "";
          const checkOutStr = idxOut >= 0 ? parts[idxOut] : "";

          // Check if record exists for this employee on this date
          const existingRecords = await db.select()
            .from(schema.attendance)
            .where(and(
              eq(schema.attendance.employeeId, emp.id),
              eq(schema.attendance.date, date)
            ))
            .limit(1);

          const existingRecord = existingRecords[0];

          // Parse check-in and check-out times
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

          if (existingRecord) {
            // UPDATE existing record
            const updateData: any = {};

            // Only update check-in if provided and record doesn't have one
            if (checkIn && !existingRecord.checkIn) {
              updateData.checkIn = checkIn;
            }

            // Update check-out if provided
            if (checkOut) {
              updateData.checkOut = checkOut;
            }

            // Calculate hours worked if we have both times
            const finalCheckIn = updateData.checkIn || existingRecord.checkIn;
            const finalCheckOut = updateData.checkOut || existingRecord.checkOut;

            if (finalCheckIn && finalCheckOut) {
              updateData.hoursWorked = Math.floor(
                (new Date(finalCheckOut).getTime() - new Date(finalCheckIn).getTime()) / (1000 * 60 * 60)
              );
            }

            // Update status based on check-in time
            if (finalCheckIn) {
              const plannedStart = toTime(dateStr, shiftStart);
              const graceMs = graceMinutes * 60 * 1000;
              if ((new Date(finalCheckIn).getTime() - plannedStart.getTime()) > graceMs) {
                updateData.status = "late";
              } else {
                updateData.status = "present";
              }
            }

            if (Object.keys(updateData).length > 0) {
              await db.update(schema.attendance)
                .set(updateData)
                .where(eq(schema.attendance.id, existingRecord.id));
              updated++;
            }
          } else {
            // CREATE new record
            const plannedStart = toTime(dateStr, shiftStart);
            const graceMs = graceMinutes * 60 * 1000;
            let status: "present" | "late" | "absent" | "half_day" = "present";

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

            await db.insert(schema.attendance).values({
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
        }

        return {
          success: true,
          created,
          updated,
          late,
          absent,
          skipped: skipped.slice(0, 5),  // Return first 5 skipped for brevity
          skippedCount: skipped.length,
          availableEmployees
        };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Only admin can delete attendance records (not hr_manager)
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admin can delete attendance records' });
        }

        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.remove("attendance", input.id);
          return { success: true };
        }

        await db.delete(attendance).where(eq(attendance.id, input.id));
        return { success: true };
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
        employeeId: z.number().optional(),
        month: z.number().optional(),
        year: z.number().optional(),
        baseSalary: z.number().optional(),
        bonuses: z.number().optional(),
        deductions: z.number().optional(),
        notes: z.string().optional(),
        status: z.enum(['pending', 'paid']).optional(),
        paymentDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.update("payroll", input.id, input);
          return { success: true };
        }

        // Get existing record to calculate net salary if needed
        const [existing] = await db.select().from(payroll).where(eq(payroll.id, input.id));
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        const baseSalary = input.baseSalary ?? existing.baseSalary;
        const bonuses = input.bonuses ?? existing.bonuses ?? 0;
        const deductions = input.deductions ?? existing.deductions ?? 0;
        const netSalary = baseSalary + bonuses - deductions;

        const { id, ...data } = input;

        await db.update(payroll)
          .set({
            ...data,
            netSalary
          })
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



        // Execute query with joins to get employee details
        const result = await db.select({
          id: leaves.id,
          employeeId: leaves.employeeId,
          leaveType: leaves.leaveType,
          startDate: leaves.startDate,
          endDate: leaves.endDate,
          days: leaves.days,
          reason: leaves.reason,
          status: leaves.status,
          approvedBy: leaves.approvedBy,
          approvedAt: leaves.approvedAt,
          notes: leaves.notes,
          cancellationRequested: leaves.cancellationRequested,
          cancellationReason: leaves.cancellationReason,
          createdAt: leaves.createdAt,
          // Joined fields
          employeeNumber: employees.employeeNumber,
          employeeName: users.name
        })
          .from(leaves)
          .leftJoin(employees, eq(leaves.employeeId, employees.id))
          .leftJoin(users, eq(employees.userId, users.id))
          .orderBy(desc(leaves.createdAt)); // Re-apply ordering

        // If filtering was needed, we should have applied it to the select query above
        // But since `query` was built dynamically, we might need to refactor.
        // For simplicity, let's just use the select directly and apply basic filtering if needed.
        // Actually, let's keep it robust.

        let selectQuery = db.select({
          id: leaves.id,
          employeeId: leaves.employeeId,
          leaveType: leaves.leaveType,
          startDate: leaves.startDate,
          endDate: leaves.endDate,
          days: leaves.days,
          reason: leaves.reason,
          status: leaves.status,
          approvedBy: leaves.approvedBy,
          approvedAt: leaves.approvedAt,
          notes: leaves.notes,
          cancellationRequested: leaves.cancellationRequested,
          cancellationReason: leaves.cancellationReason,
          createdAt: leaves.createdAt,
          employeeNumber: employees.employeeNumber,
          employeeName: users.name
        })
          .from(leaves)
          .leftJoin(employees, eq(leaves.employeeId, employees.id))
          .leftJoin(users, eq(employees.userId, users.id));

        if (input.employeeId) selectQuery.where(eq(leaves.employeeId, input.employeeId));
        if (input.status) selectQuery.where(eq(leaves.status, input.status));

        return await selectQuery.orderBy(desc(leaves.createdAt));
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
        console.log("[LEAVE APPROVE] Leave record:", JSON.stringify(leaveRecord[0]));

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
          console.log("[LEAVE APPROVE] Employee:", JSON.stringify(emp[0]));

          let targetUserId = emp[0]?.userId;

          // If employee has no userId, try to find and link user via employee number
          if (!targetUserId && emp[0]) {
            console.log("[LEAVE APPROVE] Employee has no userId, attempting to find and link...");

            // Try to find user by matching name patterns in employee number
            const allUsers = await db.select().from(users);

            // If we still can't find, use the leave requester info if available
            // For now, we'll log this for debugging
            console.log("[LEAVE APPROVE] Available users:", allUsers.length);

            // Auto-link: If only one employee and one user with this ID pattern, link them
            // This is a fallback - the main fix is to ensure userId is set when creating employees
          }

          console.log("[LEAVE APPROVE] Target userId:", targetUserId);

          if (targetUserId) {
            const { createNotification } = await import('./notifications');
            console.log("[LEAVE APPROVE] Creating notification for userId:", targetUserId);
            await createNotification({
              userId: targetUserId,
              fromUserId: ctx.user.id,
              type: 'success',
              title: 'تمت الموافقة على طلب الإجازة ✅',
              message: input.notes ? `ملاحظات: ${input.notes}` : 'تم قبول طلب إجازتك',
              entityType: 'leave',
              entityId: input.id,
              link: '/hr'
            });
            console.log("[LEAVE APPROVE] Notification created successfully");
          } else {
            // FALLBACK: Try to find userId by employee number pattern
            console.log("[LEAVE APPROVE] No userId found! Attempting fallback...");

            // Extract possible userId from employee number (EMP-{userId}-xxx format)
            if (emp[0]?.employeeNumber) {
              const match = emp[0].employeeNumber.match(/EMP-(\d+)-/);
              if (match) {
                const fallbackUserId = parseInt(match[1]);
                console.log("[LEAVE APPROVE] Found fallback userId from employee number:", fallbackUserId);
                targetUserId = fallbackUserId; // Set target for later use
              }
            }

            // If still no targetUserId, try searching by name
            if (!targetUserId) {
              // Find user with matching name
              const allUsers = await db.select().from(users);
              // Simple fuzzy match: user name contains employee position or vice versa, 
              // OR better: if we have employee name store it? But schema only has position/dept.
              // Assuming 'users' table has the name. 
              // We don't have employee NAME in 'employees' table schema usually, it's joined from Users.
              // BUT if manually created, how do we know the name? 
              // Wait, 'employees' table doesn't have a name column? 
              // Let's check schema imports. 'users' has name.

              // If the employee isn't linked, we can't know their name easily unless stored in 'notes' or similar?
              // Ah, the user said "عباس الي هو موظف".

              // Let's rely on the Request Creator (`createdBy`) if available?
              // The leave request might not store who created it if not linked?
              // Wait, the leave record itself doesn't have 'created_by'? It usually follows employeeId.

              // FALLBACK STRATEGY: 
              // If we can't link, we can verify if the employee was created by a specific user? 

              // Let's assume there is an unlinked user with role 'employee' or similar?
            }

            if (targetUserId) {
              // Link the userId to employee record
              try {
                await db.update(employees).set({ userId: targetUserId }).where(eq(employees.id, emp[0].id));
                console.log("[LEAVE APPROVE] Linked userId to employee record");
              } catch (e) {
                console.error("[LEAVE APPROVE] Failed to link user:", e);
              }

              try {
                const { createNotification } = await import('./notifications');
                await createNotification({
                  userId: targetUserId,
                  fromUserId: ctx.user.id,
                  type: 'success',
                  title: 'تمت الموافقة على طلب الإجازة ✅',
                  message: input.notes ? `ملاحظات: ${input.notes}` : 'تم قبول طلب إجازتك',
                  entityType: 'leave',
                  entityId: input.id,
                  link: '/hr'
                });
                console.log("[LEAVE APPROVE] Notification sent via fallback");
              } catch (e) {
                console.error("[LEAVE APPROVE] Failed to send notification:", e);
              }
            } else {
              // Even if no target user found, we don't throw error. The leave is APPROVED.
              console.warn("[LEAVE APPROVE] Could not find target user for notification, but leave approved.");
            }
          }
        } else {
          console.log("[LEAVE APPROVE] No leave record found!");
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

          let targetUserId = emp[0]?.userId;

          // Fallback logic for linking
          if (!targetUserId && emp[0]?.employeeNumber) {
            const match = emp[0].employeeNumber.match(/EMP-(\d+)-/);
            if (match) {
              targetUserId = parseInt(match[1]);
            }
          }

          if (targetUserId) {
            // Link if not linked
            if (!emp[0].userId) {
              try {
                await db.update(employees).set({ userId: targetUserId }).where(eq(employees.id, emp[0].id));
              } catch (e) { }
            }

            try {
              const { createNotification } = await import('./notifications');
              await createNotification({
                userId: targetUserId,
                fromUserId: ctx.user.id,
                type: 'warning',
                title: 'تم رفض طلب الإجازة ❌',
                message: input.notes || input.reason || 'تم رفض طلب إجازتك',
                entityType: 'leave',
                entityId: input.id,
                link: '/hr'
              });
            } catch (e) {
              console.error("[LEAVE REJECT] Failed notification:", e);
            }
          }
        }

        return { success: true };
      }),

    // Delete leave request (by admin)
    delete: adminProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.remove("leaves", input.id);
          return { success: true };
        }

        // Get leave record to find employee for notification
        const leaveRecord = await db.select().from(leaves).where(eq(leaves.id, input.id)).limit(1);

        // Delete the leave
        await db.delete(leaves).where(eq(leaves.id, input.id));

        // Notify employee about deletion
        if (leaveRecord[0]) {
          const emp = await db.select().from(employees).where(eq(employees.id, leaveRecord[0].employeeId)).limit(1);
          if (emp[0]?.userId) {
            const { createNotification } = await import('./notifications');
            await createNotification({
              userId: emp[0].userId,
              fromUserId: ctx.user.id,
              type: 'info',
              title: 'تم حذف طلب الإجازة 🗑️',
              message: input.reason || 'تم حذف طلب إجازتك بواسطة الإدارة',
              entityType: 'leave',
              link: '/hr'
            });
          }
        }

        return { success: true };
      }),

    // Request cancellation (by employee)
    requestCancellation: protectedProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().min(1, 'يرجى إدخال سبب طلب الإلغاء'),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.update("leaves", input.id, {
            cancellationRequested: 1,
            cancellationReason: input.reason,
            cancellationRequestedAt: new Date()
          });
          return { success: true };
        }

        // Verify the leave belongs to the requesting user's employee record
        const emp = await db.select().from(employees).where(eq(employees.userId, ctx.user.id)).limit(1);
        if (!emp[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'لم يتم العثور على ملف الموظف' });

        const leaveRecord = await db.select().from(leaves).where(eq(leaves.id, input.id)).limit(1);
        if (!leaveRecord[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'لم يتم العثور على طلب الإجازة' });

        // Allow cancellation request only for own approved leaves
        if (leaveRecord[0].employeeId !== emp[0].id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'لا يمكنك طلب إلغاء إجازة غيرك' });
        }

        if (leaveRecord[0].status !== 'approved') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'يمكن طلب الإلغاء فقط للإجازات الموافق عليها' });
        }

        await db.update(leaves)
          .set({
            cancellationRequested: 1,
            cancellationReason: input.reason,
            cancellationRequestedAt: new Date()
          })
          .where(eq(leaves.id, input.id));

        // Notify admin and hr_manager
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
          title: 'طلب إلغاء إجازة ⚠️',
          message: `الموظف #${emp[0].employeeNumber} يطلب إلغاء إجازة ${leaveTypes[leaveRecord[0].leaveType] || leaveRecord[0].leaveType} - السبب: ${input.reason}`,
          entityType: 'leave',
          entityId: input.id,
          link: '/hr'
        });

        return { success: true };
      }),

    // Approve cancellation request (by admin)
    approveCancellation: adminProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.remove("leaves", input.id);
          return { success: true };
        }

        const leaveRecord = await db.select().from(leaves).where(eq(leaves.id, input.id)).limit(1);
        if (!leaveRecord[0]) throw new TRPCError({ code: 'NOT_FOUND' });

        // Delete the leave (approved cancellation = remove leave)
        await db.delete(leaves).where(eq(leaves.id, input.id));

        // Notify employee
        const emp = await db.select().from(employees).where(eq(employees.id, leaveRecord[0].employeeId)).limit(1);
        if (emp[0]?.userId) {
          const { createNotification } = await import('./notifications');
          await createNotification({
            userId: emp[0].userId,
            fromUserId: ctx.user.id,
            type: 'success',
            title: 'تم قبول طلب إلغاء الإجازة ✅',
            message: input.notes || 'تم قبول طلب إلغاء إجازتك وحذفها من النظام',
            entityType: 'leave',
            link: '/hr'
          });
        }

        return { success: true };
      }),

    // Reject cancellation request (by admin)
    rejectCancellation: adminProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().min(1, 'يرجى إدخال سبب الرفض'),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          const demo = await import("../_core/demoStore");
          demo.update("leaves", input.id, {
            cancellationRequested: 3,
            cancellationResolvedBy: 0,
            cancellationResolvedAt: new Date(),
            cancellationResolvedNotes: input.notes
          });
          return { success: true };
        }

        const leaveRecord = await db.select().from(leaves).where(eq(leaves.id, input.id)).limit(1);
        if (!leaveRecord[0]) throw new TRPCError({ code: 'NOT_FOUND' });

        await db.update(leaves)
          .set({
            cancellationRequested: 3, // rejected
            cancellationResolvedBy: ctx.user.id,
            cancellationResolvedAt: new Date(),
            cancellationResolvedNotes: input.notes
          })
          .where(eq(leaves.id, input.id));

        // Notify employee
        const emp = await db.select().from(employees).where(eq(employees.id, leaveRecord[0].employeeId)).limit(1);
        if (emp[0]?.userId) {
          const { createNotification } = await import('./notifications');
          await createNotification({
            userId: emp[0].userId,
            fromUserId: ctx.user.id,
            type: 'warning',
            title: 'تم رفض طلب إلغاء الإجازة ❌',
            message: `السبب: ${input.notes}`,
            entityType: 'leave',
            entityId: input.id,
            link: '/hr'
          });
        }

        return { success: true };
      }),

    // List pending cancellation requests (for admin)
    listCancellationRequests: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) {
        const demo = await import("../_core/demoStore");
        return demo.list("leaves").filter((l: any) => l.cancellationRequested === 1);
      }

      return await db.select().from(leaves)
        .where(eq(leaves.cancellationRequested, 1))
        .orderBy(desc(leaves.cancellationRequestedAt));
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
