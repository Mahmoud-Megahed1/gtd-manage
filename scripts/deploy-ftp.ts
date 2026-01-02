import fs from "fs";
import path from "path";
import { Client } from "basic-ftp";
import dotenv from "dotenv";

// Load .env from project root (one level up from scripts/, two levels if running from client?)
// Actually, CWD when running "npm run deploy:ftp" (defined in root package.json) is root.
// BUT, user ran it from "D:\new project\GTD-manage\GTD-manage\client" in previous commands?
// Wait, the npm run command in user log shows: "D:\new project\GTD-manage\GTD-manage\client> npm run deploy:ftp".
// And the package.json shown earlier was D:\new project\GTD-manage\GTD-manage\package.json.
// If the user is in "client", running npm run deploy:ftp... does client/package.json have this script?
// Let's assume the script is in scripts/deploy-ftp.ts relative to root.
// Safest bet: Try loading from up one directory if not found.

const rootEnv = path.resolve(__dirname, '..', '.env'); // scripts/../.env
dotenv.config({ path: rootEnv });
if (!process.env.FTP_HOST) {
  // Fallback: try default loading if running from root
  dotenv.config();
}

async function main() {
  const host = process.env.FTP_HOST || "";
  const user = process.env.FTP_USER || "";
  const password = process.env.FTP_PASSWORD || "";
  const port = parseInt(process.env.FTP_PORT || "21", 10);
  const targetDir = process.env.FTP_TARGET || "";
  const localDir = process.env.FTP_LOCAL_DIR || path.resolve(process.cwd(), "dist", "public");

  if (!host || !user || !password || !targetDir) {
    throw new Error("Missing FTP credentials or target. Required: FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_TARGET");
  }
  if (!fs.existsSync(localDir)) {
    throw new Error(`Local directory not found: ${localDir}. Build the project before deploying.`);
  }

  const client = new Client();
  client.ftp.verbose = true;
  try {
    await client.access({ host, user, password, port, secure: false });
    await client.ensureDir(targetDir);
    await client.uploadFromDir(localDir);
  } finally {
    client.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
