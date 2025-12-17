/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import * as demo from "./demoStore";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Check if there's a session cookie at all - helps detect logged-out state
  const cookies = opts.req.headers.cookie || "";
  const hasSessionCookie = cookies.includes("GT_SESSION=") && !cookies.includes("GT_SESSION=;");

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Only auto-login in dev mode if:
  // 1. No user from real authentication
  // 2. Not in production
  // 3. There IS a session cookie (meaning user went through login flow)
  //    This prevents auto-login after logout (when cookie is cleared)
  if (!user && process.env.NODE_ENV !== "production" && hasSessionCookie) {
    const users = demo.list("users");
    const admin = users.find((u: any) => (u.role || "") === "admin") || users[0];
    if (admin) {
      user = {
        id: admin.id,
        openId: admin.openId || "dev-admin",
        name: admin.name || "Developer",
        email: admin.email || "admin@example.com",
        role: (admin.role || "admin") as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        loginMethod: "dev",
        lastSignedIn: new Date(),
      } as unknown as User;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
