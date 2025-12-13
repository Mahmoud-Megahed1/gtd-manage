import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import * as demo from "./demoStore";
import fs from "fs";
import path from "path";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  if (process.env.NODE_ENV === "production") {
    if (!process.env.COOKIE_SECRET && !process.env.JWT_SECRET) {
      throw new Error("Security error: COOKIE_SECRET/JWT_SECRET مطلوب في الإنتاج");
    }
  }
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // CORS for separated frontend origin with credentials
  app.use((req, res, next) => {
    try {
      const configuredOrigin = process.env.WEB_ORIGIN || "";
      const origin = configuredOrigin || (req.headers.origin as string) || "";
      if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
      }
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
    } catch {}
    next();
  });
  app.get("/healthz", (_req, res) => {
    res.status(200).json({
      ok: true,
      env: process.env.NODE_ENV || "development",
      time: new Date().toISOString(),
    });
  });
  // Demo seed: ensure at least one admin user exists when no database is configured
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
        console.log("[DemoSeed] Created seed admin user: admin@goldentouch.local");
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
        console.log("[DemoSeed] Registered admin email: almalkalhzen@gmail.com");
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
        console.log("[DemoSeed] Registered admin email: gtd.project.manager@gmail.com");
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
        } catch {}
      }
    }
  } catch {}
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Serve embedded HTML pages from disk with sanitization for invoice
  app.get("/fatore.HTML", (req, res) => {
    try {
      const filePath = path.resolve(process.cwd(), "fatore.HTML");
      if (!fs.existsSync(filePath)) {
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
        // Inject logo inside the existing placeholder in header
        .replace(
          /<div[^>]+class=["']logo-placeholder["'][^>]*>[\s\S]*?<\/div>/i,
          injectLogo ? `<div class="logo-placeholder"><img src="${logoUrl}" alt="Logo" style="max-height:100px;object-fit:contain"/></div>` : `<div class="logo-placeholder"></div>`
        )
        // Inject barcode inside the existing placeholder in footer
        .replace(
          /<div[^>]+class=["']barcode-placeholder["'][^>]*>[\s\S]*?<\/div>/i,
          injectBarcode ? `<div class="barcode-placeholder"><img src="${barcodeUrl}" alt="Barcode" style="max-height:100px;object-fit:contain"/></div>` : `<div class="barcode-placeholder"></div>`
        );
      res.type("html").send(html);
    } catch {
      res.status(500).send("failed to read fatore.HTML");
    }
  });
  // Raw endpoint without any modifications for direct embedding
  app.get("/clinthope.raw.html", (req, res) => {
    try {
      const filePath = path.resolve(process.cwd(), "clinthope.html");
      if (!fs.existsSync(filePath)) {
        res.status(404).send("clinthope.html not found");
        return;
      }
      const html = fs.readFileSync(filePath, "utf-8");
      res.type("html").send(html);
    } catch {
      res.status(500).send("failed to read clinthope.html");
    }
  });
  app.get("/clinthope.html", (req, res) => {
    try {
      const filePath = path.resolve(process.cwd(), "clinthope.html");
      if (!fs.existsSync(filePath)) {
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
        // Inject logo inside the header block to preserve layout and sizing context
        .replace(/<div[^>]+class=["']header["'][^>]*>/i, (m) => `${m}${logo}`)
        ;
      res.type("html").send(html);
    } catch {
      res.status(500).send("failed to read clinthope.html");
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
