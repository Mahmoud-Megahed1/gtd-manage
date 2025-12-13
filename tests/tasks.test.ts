import { describe, it, expect } from "vitest";
import { appRouter } from "../server/routers";

const ctx = {
  req: {} as any,
  res: {} as any,
  user: { id: 1, role: "admin" } as any,
};

describe("Tasks router", () => {
  it("list returns array", async () => {
    const caller = appRouter.createCaller(ctx as any);
    const res = await caller.tasks.list({});
    expect(Array.isArray(res)).toBe(true);
  });
});
