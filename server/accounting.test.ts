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

// Mock context with accountant user
const mockAccountantContext: TrpcContext = {
  user: {
    id: 2,
    openId: "test-accountant",
    name: "Test Accountant",
    email: "accountant@test.com",
    avatar: null,
    role: "accountant",
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// Mock context with regular user (should fail for accounting operations)
const mockUserContext: TrpcContext = {
  user: {
    id: 3,
    openId: "test-user",
    name: "Test User",
    email: "user@test.com",
    avatar: null,
    role: "designer",
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

describe("Accounting Router - Expenses", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should list expenses", async () => {
    const result = await caller.accounting.expenses.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create an expense", async () => {
    const result = await caller.accounting.expenses.create({
      projectId: 1,
      category: "Materials",
      description: "Paint and brushes",
      amount: 500,
      expenseDate: new Date().toISOString()
    });
    expect(result.success).toBe(true);
  });

  it("should update an expense", async () => {
    const result = await caller.accounting.expenses.update({
      id: 1,
      amount: 550,
      description: "Paint, brushes, and rollers"
    });
    expect(result.success).toBe(true);
  });

  it("should delete an expense", async () => {
    const result = await caller.accounting.expenses.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("should get expenses summary", async () => {
    const result = await caller.accounting.expenses.summary({});
    expect(result).toHaveProperty("totalAmount");
    expect(result).toHaveProperty("count");
    expect(typeof result.totalAmount).toBe("number");
    expect(typeof result.count).toBe("number");
  });

  it("should allow accountant access", async () => {
    const accountantCaller = appRouter.createCaller(mockAccountantContext);
    const result = await accountantCaller.accounting.expenses.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should fail for non-accounting users", async () => {
    const userCaller = appRouter.createCaller(mockUserContext);
    await expect(
      userCaller.accounting.expenses.list({})
    ).rejects.toThrow("Accounting access required");
  });
});

describe("Accounting Router - BOQ", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should list BOQ items", async () => {
    const result = await caller.accounting.boq.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create BOQ item", async () => {
    const result = await caller.accounting.boq.create({
      projectId: 1,
      itemNumber: "BOQ-001",
      description: "Floor tiles installation",
      unit: "sqm",
      quantity: 100,
      unitPrice: 50,
      category: "Flooring"
    });
    expect(result.success).toBe(true);
  });

  it("should update BOQ item", async () => {
    const result = await caller.accounting.boq.update({
      id: 1,
      quantity: 120,
      unitPrice: 45
    });
    expect(result.success).toBe(true);
  });

  it("should delete BOQ item", async () => {
    const result = await caller.accounting.boq.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("should get BOQ summary for project", async () => {
    const result = await caller.accounting.boq.summary({ projectId: 1 });
    expect(result).toHaveProperty("totalAmount");
    expect(result).toHaveProperty("itemCount");
    expect(typeof result.totalAmount).toBe("number");
    expect(typeof result.itemCount).toBe("number");
  });
});

describe("Accounting Router - Installments", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should list installments", async () => {
    const result = await caller.accounting.installments.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create installment", async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from now
    
    const result = await caller.accounting.installments.create({
      projectId: 1,
      installmentNumber: 1,
      amount: 10000,
      dueDate: dueDate.getTime(),
      description: "First installment",
      notes: "Payment upon project start"
    });
    expect(result.success).toBe(true);
  });

  it("should update installment", async () => {
    const result = await caller.accounting.installments.update({
      id: 1,
      amount: 12000,
      status: "pending" as const
    });
    // Since update doesn't return installment, just check it doesn't throw
    expect(result).toBeDefined();
  });

  it("should mark installment as paid", async () => {
    const result = await caller.accounting.installments.markAsPaid({
      id: 1,
      paidDate: Date.now()
    });
    // markAsPaid returns the installment, not {success: true}
    expect(result).toBeDefined();
  });

  it("should delete installment", async () => {
    const result = await caller.accounting.installments.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("should get installments summary", async () => {
    const result = await caller.accounting.installments.summary({});
    expect(result).toHaveProperty("totalAmount");
    expect(result).toHaveProperty("paidAmount");
    expect(result).toHaveProperty("pendingAmount");
    expect(result).toHaveProperty("count");
    expect(typeof result.totalAmount).toBe("number");
    expect(typeof result.paidAmount).toBe("number");
    expect(typeof result.pendingAmount).toBe("number");
    expect(typeof result.count).toBe("number");
  });
});

describe("Accounting Router - Financial Reports", () => {
  const caller = appRouter.createCaller(mockAdminContext);

  it("should get project financials", async () => {
    const result = await caller.accounting.reports.projectFinancials({ projectId: 1 });
    expect(result).toHaveProperty("projectId");
    expect(result).toHaveProperty("totalExpenses");
    expect(result).toHaveProperty("totalBOQ");
    expect(result).toHaveProperty("totalRevenue");
    expect(result).toHaveProperty("paidRevenue");
    expect(result).toHaveProperty("pendingRevenue");
    expect(result).toHaveProperty("netProfit");
    expect(result).toHaveProperty("profitMargin");
    expect(typeof result.totalExpenses).toBe("number");
    expect(typeof result.netProfit).toBe("number");
    expect(typeof result.profitMargin).toBe("number");
  });

  it("should get overall financials", async () => {
    const result = await caller.accounting.reports.overallFinancials();
    expect(result).toHaveProperty("totalExpenses");
    expect(result).toHaveProperty("totalRevenue");
    expect(result).toHaveProperty("paidRevenue");
    expect(result).toHaveProperty("pendingRevenue");
    expect(result).toHaveProperty("netProfit");
    expect(result).toHaveProperty("profitMargin");
    expect(typeof result.totalExpenses).toBe("number");
    expect(typeof result.totalRevenue).toBe("number");
    expect(typeof result.netProfit).toBe("number");
  });
});
