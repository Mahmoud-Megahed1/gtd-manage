/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import express from "express";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import * as demo from "./demoStore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export function createApp() {
  const app = express();

  // Trust proxy for Hostinger/reverse proxy (required for secure cookies)
  app.set("trust proxy", 1);

  if (process.env.NODE_ENV === "production") {
    if (!process.env.COOKIE_SECRET && !process.env.JWT_SECRET) {
      throw new Error("Security error: COOKIE_SECRET/JWT_SECRET مطلوب في الإنتاج");
    }
    if (!process.env.WEB_ORIGIN) {
      throw new Error("Security error: WEB_ORIGIN is required in production");
    }
  }
  // Increase limit to 150MB to support 100MB video files (base64 adds ~33% overhead)
  app.use(express.json({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "150mb", extended: true }));
  app.use((req, res, next) => {
    try {
      const configuredOrigin = process.env.WEB_ORIGIN || "";
      const requestOrigin = req.headers.origin as string | undefined;

      // In production, only allow configured origin
      // In development, allow request origin as fallback
      let allowedOrigin = configuredOrigin;
      if (!configuredOrigin && process.env.NODE_ENV !== "production" && requestOrigin) {
        allowedOrigin = requestOrigin;
      }

      if (allowedOrigin) {
        res.header("Access-Control-Allow-Origin", allowedOrigin);
        res.header("Vary", "Origin");
      }
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
    } catch { }
    next();
  });
  app.get("/healthz", (_req, res) => {
    res.status(200).json({
      ok: true,
      env: process.env.NODE_ENV || "development",
      time: new Date().toISOString(),
    });
  });
  try {
    if (!process.env.DATABASE_URL) {
      const users = demo.list("users");
      if (users.length === 0) {
        demo.insert("users", {
          openId: "seed-admin",
          name: "Admin",
          email: "admin@goldentouch.local",
          role: "admin",
          loginMethod: "dev",
          lastSignedIn: new Date()
        });
      }
      const hasRequestedAdmin = users.some((u: any) => (u.email || "").toLowerCase() === "almalkalhzen@gmail.com");
      if (!hasRequestedAdmin) {
        demo.insert("users", {
          openId: "alm-" + Math.random().toString(36).slice(2),
          name: "System Admin",
          email: "almalkalhzen@gmail.com",
          role: "admin",
          loginMethod: "dev",
          lastSignedIn: new Date()
        });
      }
      const hasPMAdmin = users.some((u: any) => (u.email || "").toLowerCase() === "gtd.project.manager@gmail.com");
      if (!hasPMAdmin) {
        const rec = demo.insert("users", {
          openId: "pm-" + Math.random().toString(36).slice(2),
          name: "Project Manager",
          email: "gtd.project.manager@gmail.com",
          role: "admin",
          loginMethod: "dev",
          lastSignedIn: new Date()
        });
        try {
          demo.insert("userPermissions", {
            userId: rec.id,
            permissionsJson: JSON.stringify({
              clients: true,
              projects: true,
              invoices: true,
              forms: true,
              accounting: true,
              hr: true,
              attachments: true,
              settings: true,
              dashboard: true,
              search: true
            }),
            updatedAt: new Date()
          });
        } catch { }
      }
    }
  } catch { }
  registerOAuthRoutes(app);
  app.get("/fatore.HTML", (req, res) => {
    try {
      // Try multiple paths for different environments
      const possiblePaths = [
        path.resolve(process.cwd(), "fatore.HTML"),
        path.resolve(process.cwd(), "dist", "fatore.HTML"),
        path.resolve(__dirname, "../../fatore.HTML"),
        path.resolve(__dirname, "../../../fatore.HTML"),
        path.resolve(__dirname, "../fatore.HTML"),
        path.resolve(__dirname, "../../dist/public/fatore.HTML"),
        path.resolve(__dirname, "fatore.HTML"),
      ];

      console.log("[fatore.HTML] Searching in paths:", possiblePaths.map(p => ({ path: p, exists: fs.existsSync(p) })));

      let filePath = "";
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          filePath = p;
          console.log("[fatore.HTML] Found at:", p);
          break;
        }
      }

      if (!filePath) {
        console.error("[fatore.HTML] File not found in any of:", possiblePaths);
        res.status(404).send("fatore.HTML not found");
        return;
      }

      let html = fs.readFileSync(filePath, "utf-8");
      html = html
        .replace(/src=["']data:image[^"']+["']/gi, 'src=""')
        .replace(/url\\(data:image[^)]+\\)/gi, "none")
        .replace(/url\\(['"]data:image[^'"]+['"]\\)/gi, "none");
      const settingsItems = demo.list("companySettings");
      const getSetting = (k: string, d: string) => {
        const f = settingsItems.find((it: any) => it.settingKey === k);
        const v = f?.settingValue;
        return (typeof v === "string" && v) ? v : d;
      };
      const injectLogo = (getSetting("invoiceInjectLogo", "true") === "true");
      const injectBarcode = (getSetting("invoiceInjectBarcode", "true") === "true");
      const logoUrl = getSetting("companyLogoUrl", "/logo.png");
      const barcodeUrl = getSetting("companyBarcodeUrl", "/barcode.jpg");
      html = html
        .replace(
          /<div[^>]+class=["']logo-placeholder["'][^>]*>[\s\S]*?<\/div>/i,
          injectLogo ? `<div class="logo-placeholder"><img src="${logoUrl}" alt="Logo" style="max-height:100px;object-fit:contain"/></div>` : `<div class="logo-placeholder"></div>`
        )
        .replace(
          /<div[^>]+class=["']barcode-placeholder["'][^>]*>[\s\S]*?<\/div>/i,
          injectBarcode ? `<div class="barcode-placeholder"><img src="${barcodeUrl}" alt="Barcode" style="max-height:100px;object-fit:contain"/></div>` : `<div class="barcode-placeholder"></div>`
        );
      res.type("html").send(html);
    } catch (err) {
      console.error("[fatore.HTML] Error:", err);
      res.status(500).send("failed to read fatore.HTML");
    }
  });
  app.get("/clinthope.raw.html", (req, res) => {
    try {
      const possiblePaths = [
        path.resolve(process.cwd(), "clinthope.html"),
        path.resolve(process.cwd(), "dist", "clinthope.html"),
        path.resolve(__dirname, "../../clinthope.html"),
        path.resolve(__dirname, "../../../clinthope.html"),
        path.resolve(__dirname, "../clinthope.html"),
        path.resolve(__dirname, "clinthope.html"),
      ];

      console.log("[clinthope.raw.html] Searching in paths:", possiblePaths.map(p => ({ path: p, exists: fs.existsSync(p) })));

      let filePath = "";
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          filePath = p;
          console.log("[clinthope.raw.html] Found at:", p);
          break;
        }
      }

      if (!filePath) {
        console.error("[clinthope.raw.html] File not found in any of:", possiblePaths);
        res.status(404).send("clinthope.html not found");
        return;
      }
      const html = fs.readFileSync(filePath, "utf-8");
      res.type("html").send(html);
    } catch (err) {
      console.error("[clinthope.raw.html] Error:", err);
      res.status(500).send("failed to read clinthope.html");
    }
  });
  app.get("/clinthope.html", (req, res) => {
    try {
      const possiblePaths = [
        path.resolve(process.cwd(), "clinthope.html"),
        path.resolve(process.cwd(), "dist", "clinthope.html"),
        path.resolve(__dirname, "../../clinthope.html"),
        path.resolve(__dirname, "../../../clinthope.html"),
        path.resolve(__dirname, "../clinthope.html"),
        path.resolve(__dirname, "clinthope.html"),
      ];

      console.log("[clinthope.html] Searching in paths:", possiblePaths.map(p => ({ path: p, exists: fs.existsSync(p) })));

      let filePath = "";
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          filePath = p;
          console.log("[clinthope.html] Found at:", p);
          break;
        }
      }

      if (!filePath) {
        console.error("[clinthope.html] File not found in any of:", possiblePaths);
        res.status(404).send("clinthope.html not found");
        return;
      }
      let html = fs.readFileSync(filePath, "utf-8");
      html = html
        .replace(/src=["']data:image[^"']+["']/gi, 'src=""')
        .replace(/url\\(data:image[^)]+\\)/gi, "none")
        .replace(/url\\(['"]data:image[^'"]+['"]\\)/gi, "none");
      const logo = `<div class="logo-wrapper" style="display:flex;justify-content:center;align-items:center;padding:8px 0"><img src="/logo.png" alt="Logo" style="max-height:80px;object-fit:contain"/></div>`;
      html = html
        .replace(/<div[^>]+class=["']header["'][^>]*>/i, (m) => `${m}${logo}`);
      res.type("html").send(html);
    } catch (err) {
      console.error("[clinthope.html] Error:", err);
      res.status(500).send("failed to read clinthope.html");
    }
  });
  app.get("/reports.export.csv", async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx as any);
      const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), 0, 1);
      const to = req.query.to ? new Date(String(req.query.to)) : new Date();
      const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      const invoiceStatus = req.query.invoiceStatus ? String(req.query.invoiceStatus) as any : undefined;
      const purchaseStatus = req.query.purchaseStatus ? String(req.query.purchaseStatus) as any : undefined;
      const expenseStatus = req.query.expenseStatus ? String(req.query.expenseStatus) as any : undefined;
      const installmentStatus = req.query.installmentStatus ? String(req.query.installmentStatus) as any : undefined;
      const ts = await caller.reports.timeseries({
        from, to, granularity: "month",
        clientId, projectId, invoiceStatus, purchaseStatus, expenseStatus, installmentStatus
      } as any);
      const rows: string[][] = [["التاريخ", "الفواتير", "التكاليف التشغيلية", "المصروفات", "الصافي"]];
      (ts || []).forEach((r: any) => rows.push([r.dateKey, String(r.invoices), String(r.installments), String(r.expenses), String(r.net)]));
      const content = rows.map(r => r.join(",")).join("\n");
      const bomContent = "\uFEFF" + content;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="reports-${Date.now()}.csv"`);
      res.status(200).send(bomContent);
    } catch {
      res.status(500).send("failed to export csv");
    }
  });
  app.get("/reports.breakdown.csv", async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx as any);
      const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), 0, 1);
      const to = req.query.to ? new Date(String(req.query.to)) : new Date();
      const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      const inv = Array.isArray(req.query.invoiceStatuses) ? (req.query.invoiceStatuses as string[]) : (req.query.invoiceStatuses ? [String(req.query.invoiceStatuses)] : ["draft", "sent", "paid", "cancelled"]);
      const pur = Array.isArray(req.query.purchaseStatuses) ? (req.query.purchaseStatuses as string[]) : (req.query.purchaseStatuses ? [String(req.query.purchaseStatuses)] : ["pending", "completed", "cancelled"]);
      const exp = Array.isArray(req.query.expenseStatuses) ? (req.query.expenseStatuses as string[]) : (req.query.expenseStatuses ? [String(req.query.expenseStatuses)] : ["active", "cancelled"]);
      const inst = Array.isArray(req.query.installmentStatuses) ? (req.query.installmentStatuses as string[]) : (req.query.installmentStatuses ? [String(req.query.installmentStatuses)] : ["pending", "paid", "overdue", "cancelled"]);
      const breakdown = await caller.reports.timeseriesBreakdown({
        from, to, granularity: "month",
        clientId, projectId,
        invoiceStatuses: inv as any,
        purchaseStatuses: pur as any,
        expenseStatuses: exp as any,
        installmentStatuses: inst as any
      } as any);
      const statuses: string[] = [
        ...inv.map(s => `inv:${s}`),
        ...pur.map(s => `pur:${s}`),
        ...exp.map(s => `exp:${s}`),
        ...inst.map(s => `inst:${s}`),
      ];
      const header = ["date", ...statuses];
      const rows: string[][] = [header];
      (breakdown || []).forEach((r: any) => {
        const row: string[] = [r.dateKey];
        statuses.forEach((h) => {
          const [group, name] = h.split(":");
          const map = group === "inv" ? r.invoices : group === "pur" ? r.purchases : group === "exp" ? r.expenses : r.installments || {};
          const val = (map || {})[name] || 0;
          row.push(String(val));
        });
        rows.push(row);
      });
      const content = rows.map(r => r.join(",")).join("\n");
      const bomContent = "\uFEFF" + content;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="reports-breakdown-${Date.now()}.csv"`);
      res.status(200).send(bomContent);
    } catch {
      res.status(500).send("failed to export breakdown csv");
    }
  });
  app.get("/reports.print.html", async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx as any);
      const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), 0, 1);
      const to = req.query.to ? new Date(String(req.query.to)) : new Date();
      const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      const invoiceStatus = req.query.invoiceStatus ? String(req.query.invoiceStatus) as any : undefined;
      const purchaseStatus = req.query.purchaseStatus ? String(req.query.purchaseStatus) as any : undefined;
      const expenseStatus = req.query.expenseStatus ? String(req.query.expenseStatus) as any : undefined;
      const installmentStatus = req.query.installmentStatus ? String(req.query.installmentStatus) as any : undefined;
      const summary = await caller.reports.summary({
        from, to, clientId, projectId, invoiceStatus, purchaseStatus, expenseStatus, installmentStatus
      } as any);
      const ts = await caller.reports.timeseries({
        from, to, granularity: "month",
        clientId, projectId, invoiceStatus, purchaseStatus, expenseStatus, installmentStatus
      } as any);
      const html = `
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>Reports</title>
        <style>
          body{font-family:system-ui,-apple-system,Segoe UI,Roboto; padding:24px}
          .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .card{border:1px solid #ddd;border-radius:8px;padding:12px}
          table{border-collapse:collapse;width:100%;margin-top:16px}
          th,td{border:1px solid #ddd;padding:6px;text-align:right}
          h1,h2{margin:8px 0}
        </style></head>
        <body>
          <h1>التقارير</h1>
          <div class="grid">
            <div class="card"><div>إجمالي الفواتير</div><h2>${summary?.invoicesTotal ?? 0}</h2></div>
            <div class="card"><div>إجمالي التكاليف التشغيلية</div><h2>${summary?.installmentsTotal ?? 0}</h2></div>
            <div class="card"><div>إجمالي المصروفات</div><h2>${summary?.expensesTotal ?? 0}</h2></div>
            <div class="card"><div>الصافي</div><h2>${summary?.net ?? 0}</h2></div>
          </div>
          <h2>البيانات الزمنية</h2>
          <table>
            <thead><tr><th>التاريخ</th><th>الفواتير</th><th>التكاليف التشغيلية</th><th>المصروفات</th><th>الصافي</th></tr></thead>
            <tbody>
              ${(ts || []).map((r: any) => '<tr><td>' + r.dateKey + '</td><td>' + r.invoices + '</td><td>' + r.installments + '</td><td>' + r.expenses + '</td><td>' + r.net + '</td></tr>').join("")}
            </tbody>
          </table>
          <script>
            function ready(){ try { window.focus(); setTimeout(function(){ window.print(); }, 200); } catch {} }
            if (document.readyState === 'complete') ready(); else window.onload = ready;
          </script>
        </body></html>
      `;
      res.type("html").send(html);
    } catch {
      res.status(500).send("failed to render report html");
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
