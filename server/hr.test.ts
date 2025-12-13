import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/trpc";

// Mock context with admin user
const mockAdminContext: TrpcContext = {
  user: {
    id: 1,
    openId: "test-admin",
    name: "Test Admin",
    email: "admin@test.com",
    avatar: null,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// Mock context with regular user (should fail for admin-only operations)
const mockUserContext: TrpcContext = {
  user: {
    id: 2,
    openId: "test-user",
    name: "Test User",
    email: "user@test.com",
    avatar: null,
    role: "designer",
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

describe("HR Router - Employees", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should list employees", async () => {
    const result = await caller.hr.employees.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create an employee", async () => {
    const result = await caller.hr.employees.create({
      userId: 1,
      employeeNumber: `EMP-${Date.now()}`,
      department: "Design",
      position: "Senior Designer",
      hireDate: new Date(),
      salary: 5000
    });
    expect(result.success).toBe(true);
  });

  it("should fail for non-admin users", async () => {
    const nonAdminCaller = appRouter.createCaller(mockUserContext);
    await expect(
      nonAdminCaller.hr.employees.list()
    ).rejects.toThrow("Admin access required");
  });
});

describe("HR Router - Attendance", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should list attendance records", async () => {
    const result = await caller.hr.attendance.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create attendance record", async () => {
    const result = await caller.hr.attendance.checkIn({
      employeeId: 1,
      date: new Date()
    });
    expect(result.success).toBe(true);
  });

  it("should check out", async () => {
    const result = await caller.hr.attendance.checkOut({
      id: 1,
      checkOut: new Date()
    });
    expect(result.success).toBe(true);
  });
});

describe("HR Router - Payroll", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should list payroll records", async () => {
    const result = await caller.hr.payroll.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create payroll", async () => {
    const currentDate = new Date();
    const result = await caller.hr.payroll.create({
      employeeId: 1,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      baseSalary: 5000,
      bonuses: 500,
      deductions: 100
    });
    expect(result.success).toBe(true);
  });

  it("should mark payroll as paid", async () => {
    const result = await caller.hr.payroll.update({
      id: 1,
      status: "paid",
      paymentDate: new Date()
    });
    expect(result.success).toBe(true);
  });
});

describe("HR Router - Leaves", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should list leave requests", async () => {
    const result = await caller.hr.leaves.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create leave request", async () => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
    
    const result = await caller.hr.leaves.create({
      employeeId: 1,
      leaveType: "annual",
      startDate,
      endDate,
      days: 7,
      reason: "Annual vacation"
    });
    expect(result.success).toBe(true);
  });

  it("should approve leave request", async () => {
    const result = await caller.hr.leaves.approve({
      id: 1
    });
    expect(result.success).toBe(true);
  });

  it("should reject leave request", async () => {
    const result = await caller.hr.leaves.reject({
      id: 1,
      reason: "Insufficient leave balance"
    });
    expect(result.success).toBe(true);
  });
});

describe("HR Router - Performance Reviews", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should list performance reviews", async () => {
    const result = await caller.hr.reviews.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create performance review", async () => {
    const result = await caller.hr.reviews.create({
      employeeId: 1,
      reviewDate: new Date(),
      period: "Q1 2024",
      rating: 8,
      strengths: "Excellent design skills, good communication",
      weaknesses: "Time management needs improvement",
      goals: "Complete advanced design course"
    });
    expect(result.success).toBe(true);
  });

  it("should delete performance review", async () => {
    const result = await caller.hr.reviews.delete({
      id: 1
    });
    expect(result.success).toBe(true);
  });
});
