import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("clients procedures", () => {
  it("should create a new client", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const clientData = {
      name: "Test Client",
      email: "client@example.com",
      phone: "0501234567",
      address: "Test Address",
      city: "Riyadh",
      notes: "Test notes"
    };

    const result = await caller.clients.create(clientData);

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("clientNumber");
    expect(result.clientNumber).toMatch(/^CLT-/);
  });

  it("should list clients", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clients.list();

    expect(Array.isArray(result)).toBe(true);
  });
});
