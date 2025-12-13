import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";

const ctx = {
  req: {} as any,
  res: {} as any,
  user: { id: 1, role: "admin" } as any,
};

describe("Reports router", () => {
  it("summary returns shape with numbers", async () => {
    const caller = appRouter.createCaller(ctx as any);
    const res = await caller.reports.summary({ from: new Date("2024-01-01"), to: new Date("2024-12-31") });
    expect(res).toHaveProperty("invoicesTotal");
    expect(res).toHaveProperty("expensesTotal");
    expect(res).toHaveProperty("installmentsTotal");
    expect(res).toHaveProperty("purchasesTotal");
    expect(res).toHaveProperty("net");
    expect(typeof res.net).toBe("number");
  });

  it("timeseries returns array with keys", async () => {
    const caller = appRouter.createCaller(ctx as any);
    const res = await caller.reports.timeseries({ from: new Date("2024-01-01"), to: new Date("2024-02-01"), granularity: "day" });
    expect(Array.isArray(res)).toBe(true);
    if (res.length > 0) {
      const row = res[0] as any;
      expect(row).toHaveProperty("dateKey");
      expect(row).toHaveProperty("invoices");
      expect(row).toHaveProperty("expenses");
      expect(row).toHaveProperty("installments");
      expect(row).toHaveProperty("net");
    }
  });
});
