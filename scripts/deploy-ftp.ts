import fs from "fs";
import path from "path";
import { Client } from "basic-ftp";

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
