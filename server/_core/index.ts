/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app";

async function startServer() {
  const app = createApp();
  const server = createServer(app);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite-dev");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite-prod");
    serveStatic(app);
  }

  // Use PORT from environment (required for Hostinger Cloud)
  const port = parseInt(process.env.PORT || "3000", 10);

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch(console.error);
