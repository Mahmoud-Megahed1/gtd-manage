/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/_core/app";

let app: ReturnType<typeof createApp> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!app) {
    app = createApp();
  }
  (app as any)(req, res);
}
