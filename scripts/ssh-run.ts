import { Client } from "ssh2";

type Cmd = { run: string; cwd?: string };

function runSequence(conn: Client, cmds: Cmd[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const next = (i: number) => {
      if (i >= cmds.length) return resolve();
      const { run, cwd } = cmds[i];
      const cmd = cwd ? `cd ${cwd} && ${run}` : run;
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        stream.on("close", (code: number) => {
          if (code !== 0) return reject(new Error(`Command failed: ${cmd} (${code})`));
          next(i + 1);
        });
        stream.stderr.on("data", (data: Buffer) => {
          process.stderr.write(data);
        });
        stream.on("data", (data: Buffer) => {
          process.stdout.write(data);
        });
      });
    };
    next(0);
  });
}

async function main() {
  const host = process.env.SSH_HOST!;
  const port = parseInt(process.env.SSH_PORT || "22", 10);
  const username = process.env.SSH_USER!;
  const password = process.env.SSH_PASSWORD!;
  const appDir = process.env.APP_DIR!;
  const startFile = process.env.START_FILE || "dist/index.js";

  if (!host || !username || !password || !appDir) {
    throw new Error("Missing SSH_HOST, SSH_USER, SSH_PASSWORD, APP_DIR");
  }

  const conn = new Client();
  await new Promise<void>((resolve, reject) => {
    conn
      .on("ready", () => resolve())
      .on("error", reject)
      .connect({ host, port, username, password });
  });

  const cmds: Cmd[] = [
    { run: "node -v || echo no-node" },
    { run: `mkdir -p ${appDir}` },
    { run: "ls -la", cwd: appDir },
    { run: "npm -v || echo no-npm" },
    { run: "npx --version || echo no-npx" },
    { run: "npx pm2 -v || npm i -g pm2 || echo pm2-global-install-failed" },
    { run: `npx pm2 start ${startFile} --name gtd-sys --update-env`, cwd: appDir },
    { run: "npx pm2 status" },
    { run: "curl -s -o /dev/null -w '%{http_code}' https://gtd-sys.com/healthz || true" },
  ];

  try {
    await runSequence(conn, cmds);
  } finally {
    conn.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
