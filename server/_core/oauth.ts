/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import { COOKIE_NAME, ONE_YEAR_MS } from '@shared/const';
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  const allowedAdminEmails = new Set<string>([]);
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      if (!userInfo.email) {
        res.status(403).json({ error: "Email required for access" });
        return;
      }
      const existing = await db.getUserByEmail(userInfo.email);
      if (!existing) {
        res.status(403).json({ error: "Access denied: email not registered" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/dev/login", async (req: Request, res: Response) => {
    const openId = getQueryParam(req, "openId") || "dev-admin";
    const name = getQueryParam(req, "name") || "Developer";
    const email = getQueryParam(req, "email") || "developer@demo.local";
    const role = getQueryParam(req, "role") as "admin" | "accountant" | "project_manager" | "designer" | undefined;
    try {
      // In demo mode, auto-create user if not exists
      let existing = await db.getUserByEmail(email);
      if (!existing) {
        // Auto-provision in dev mode
        await db.upsertUser({
          openId,
          name,
          email,
          loginMethod: "dev",
          role: role ?? "admin",
          lastSignedIn: new Date(),
        } as any);
        existing = await db.getUserByEmail(email);
      }

      await db.upsertUser({
        openId,
        name,
        email: email ?? null,
        loginMethod: "dev",
        role: existing?.role ?? role ?? "admin",
        lastSignedIn: new Date(),
      } as any);
      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[DevLogin] Failed", error);
      res.status(500).json({ error: "Dev login failed" });
    }
  });
}
