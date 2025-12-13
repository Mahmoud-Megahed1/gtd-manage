import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("forms procedures", () => {
  it("lists all forms", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.forms.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("invoices procedures", () => {
  it("lists all invoices", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.invoices.list({});

    expect(Array.isArray(result)).toBe(true);
  });

  it("lists invoices by type", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const invoices = await caller.invoices.list({ type: "invoice" });
    const quotes = await caller.invoices.list({ type: "quote" });

    expect(Array.isArray(invoices)).toBe(true);
    expect(Array.isArray(quotes)).toBe(true);
  });
});

describe("clients procedures", () => {
  it("lists all clients", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clients.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("projects procedures", () => {
  it("lists all projects", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.list();

    expect(Array.isArray(result)).toBe(true);
  });
});
