import { Client } from "basic-ftp";
import fs from "fs";
import os from "os";
import path from "path";

async function main() {
  const host = process.env.FTP_HOST!;
  const user = process.env.FTP_USER!;
  const password = process.env.FTP_PASSWORD!;
  const port = parseInt(process.env.FTP_PORT || "21", 10);
  const targetDir = process.env.FTP_TARGET!;
  const envContent = process.env.ENV_CONTENT!;
  const uploadFilename = process.env.UPLOAD_FILENAME || ".env";

  if (!host || !user || !password || !targetDir || !envContent) {
    throw new Error("Missing variables: FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_TARGET, ENV_CONTENT");
  }

  const client = new Client();
  client.ftp.verbose = true;
  try {
    await client.access({ host, user, password, port, secure: false });
    await client.ensureDir(targetDir);
    const tmp = path.join(os.tmpdir(), `upload-${Date.now()}.txt`);
    fs.writeFileSync(tmp, envContent, "utf-8");
    await client.uploadFrom(tmp, `${targetDir}/${uploadFilename}`);
    fs.unlinkSync(tmp);
  } finally {
    client.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
