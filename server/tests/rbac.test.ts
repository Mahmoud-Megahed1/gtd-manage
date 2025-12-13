import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";

const makeCtx = (role: string) => ({
  req: {} as any,
  res: {} as any,
  user: { id: 1, role } as any,
});

describe("RBAC permissions", () => {
  it("viewer cannot access projects", async () => {
    const caller = appRouter.createCaller(makeCtx("viewer") as any);
    await expect(caller.projects.list()).rejects.toHaveProperty("code", "FORBIDDEN");
  });
  it("designer can access projects", async () => {
    const caller = appRouter.createCaller(makeCtx("designer") as any);
    const res = await caller.projects.list();
    expect(Array.isArray(res)).toBe(true);
  });
  it("accountant can access reports", async () => {
    const caller = appRouter.createCaller(makeCtx("accountant") as any);
    const res = await caller.reports.summary({ from: new Date("2024-01-01"), to: new Date("2024-12-31") });
    expect(res).toHaveProperty("net");
  });
  it("non-accountant cannot access reports", async () => {
    const caller = appRouter.createCaller(makeCtx("designer") as any);
    await expect(caller.reports.summary({} as any)).rejects.toHaveProperty("code", "FORBIDDEN");
  });
});
