import { describe, it, expect } from "vitest";
import type { Express, Request, Response } from "express";
import { registerOAuthRoutes } from "../_core/oauth";
import { sdk } from "../_core/sdk";
import * as db from "../db";
import { COOKIE_NAME } from "../shared/const";

function createFakeApp() {
  const handlers = new Map<string, (req: Request, res: Response) => void>();
  const app = {
    get: (path: string, handler: any) => {
      handlers.set(path, handler);
    },
  } as unknown as Express;
  registerOAuthRoutes(app);
  return {
    handle: async (path: string, req: Partial<Request>, res: Partial<Response> & { cookies?: any[]; redirects?: any[] }) => {
      const h = handlers.get(path) as any;
      if (!h) throw new Error(`handler not found: ${path}`);
      res.cookies = [];
      res.redirects = [];
      res.cookie = (name: string, value: string, options: Record<string, unknown>) => {
        (res.cookies as any[]).push({ name, value, options });
        return res as any;
      };
      res.redirect = (code: number, url: string) => {
        (res.redirects as any[]).push({ code, url });
        return res as any;
      };
      res.status = (code: number) => ({ json: (_: any) => ({ code }) }) as any;
      await h(req as Request, res as Response);
      return res;
    }
  };
}

describe("OAuth routes", () => {
  it("sets cookie and redirects on /api/oauth/callback", async () => {
    // Mock sdk methods
    const origExchange = sdk.exchangeCodeForToken;
    const origGetUserInfo = sdk.getUserInfo;
    const origCreateToken = sdk.createSessionToken;
    sdk.exchangeCodeForToken = async () => ({ accessToken: "x", tokenType: "Bearer", expiresIn: 3600 } as any);
    // ensure user exists
    const userEmail = "user@example.com";
    await db.createUser({ name: "User", email: userEmail, role: "designer" as any });
    sdk.getUserInfo = async () => ({ openId: "openid-1", name: "User", email: userEmail, loginMethod: "email" } as any);
    sdk.createSessionToken = async () => "jwt-cookie";

    const app = createFakeApp();
    const res = await app.handle("/api/oauth/callback", { query: { code: "abc", state: btoa("https://example.com/api/oauth/callback") }, protocol: "https", headers: {} } as any, {});
    expect((res.cookies as any[]).length).toBe(1);
    expect((res.cookies as any[])[0].name).toBe(COOKIE_NAME);
    expect((res.cookies as any[])[0].value).toBe("jwt-cookie");
    expect((res.cookies as any[])[0].options).toMatchObject({ secure: true, sameSite: "none", httpOnly: true, path: "/" });
    expect((res.redirects as any[]).length).toBe(1);
    expect((res.redirects as any[])[0].code).toBe(302);

    // restore
    sdk.exchangeCodeForToken = origExchange;
    sdk.getUserInfo = origGetUserInfo;
    sdk.createSessionToken = origCreateToken;
  });

  it("dev login sets cookie and redirects", async () => {
    const origCreateToken = sdk.createSessionToken;
    sdk.createSessionToken = async () => "jwt-cookie";
    const app = createFakeApp();
    const devEmail = "dev@example.com";
    await db.createUser({ name: "Dev", email: devEmail, role: "designer" as any });
    const res = await app.handle("/api/dev/login", { query: { openId: "dev-1", name: "Dev", email: devEmail }, protocol: "http", headers: {} } as any, {});
    expect((res.cookies as any[]).length).toBe(1);
    expect((res.cookies as any[])[0].name).toBe(COOKIE_NAME);
    expect((res.cookies as any[])[0].options).toMatchObject({ secure: false, sameSite: "lax", httpOnly: true, path: "/" });
    expect((res.redirects as any[])[0].code).toBe(302);
    sdk.createSessionToken = origCreateToken;
  });

  it("denies callback when email missing", async () => {
    const origExchange = sdk.exchangeCodeForToken;
    const origGetUserInfo = sdk.getUserInfo;
    const origCreateToken = sdk.createSessionToken;
    sdk.exchangeCodeForToken = async () => ({ accessToken: "x", tokenType: "Bearer", expiresIn: 3600 } as any);
    sdk.getUserInfo = async () => ({ openId: "openid-2", name: "NoEmail" } as any);
    sdk.createSessionToken = async () => "jwt-cookie";
    const app = createFakeApp();
    const res = await app.handle("/api/oauth/callback", { query: { code: "abc", state: btoa("https://example.com/api/oauth/callback") }, protocol: "https", headers: {} } as any, {});
    expect((res.cookies as any[]).length).toBe(0);
    expect((res.redirects as any[]).length).toBe(0);
    sdk.exchangeCodeForToken = origExchange;
    sdk.getUserInfo = origGetUserInfo;
    sdk.createSessionToken = origCreateToken;
  });

  it("denies callback for unregistered email", async () => {
    const origExchange = sdk.exchangeCodeForToken;
    const origGetUserInfo = sdk.getUserInfo;
    const origCreateToken = sdk.createSessionToken;
    sdk.exchangeCodeForToken = async () => ({ accessToken: "x", tokenType: "Bearer", expiresIn: 3600 } as any);
    sdk.getUserInfo = async () => ({ openId: "openid-3", name: "Unknown", email: "unknown@example.com", loginMethod: "email" } as any);
    sdk.createSessionToken = async () => "jwt-cookie";
    const app = createFakeApp();
    const res = await app.handle("/api/oauth/callback", { query: { code: "abc", state: btoa("https://example.com/api/oauth/callback") }, protocol: "https", headers: {} } as any, {});
    expect((res.cookies as any[]).length).toBe(0);
    expect((res.redirects as any[]).length).toBe(0);
    sdk.exchangeCodeForToken = origExchange;
    sdk.getUserInfo = origGetUserInfo;
    sdk.createSessionToken = origCreateToken;
  });

  it("denies dev login without email", async () => {
    const origCreateToken = sdk.createSessionToken;
    sdk.createSessionToken = async () => "jwt-cookie";
    const app = createFakeApp();
    const res = await app.handle("/api/dev/login", { query: { openId: "dev-2", name: "Dev" }, protocol: "http", headers: {} } as any, {});
    expect((res.cookies as any[]).length).toBe(0);
    expect((res.redirects as any[]).length).toBe(0);
    sdk.createSessionToken = origCreateToken;
  });

  it("denies dev login for unregistered email", async () => {
    const origCreateToken = sdk.createSessionToken;
    sdk.createSessionToken = async () => "jwt-cookie";
    const app = createFakeApp();
    const res = await app.handle("/api/dev/login", { query: { openId: "dev-3", name: "Dev", email: "nope@example.com" }, protocol: "http", headers: {} } as any, {});
    expect((res.cookies as any[]).length).toBe(0);
    expect((res.redirects as any[]).length).toBe(0);
    sdk.createSessionToken = origCreateToken;
  });
});
