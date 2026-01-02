import { Client } from "ssh2";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

type Cmd = { run: string; cwd?: string };

function runSequence(conn: Client, cmds: Cmd[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const next = (i: number) => {
            if (i >= cmds.length) return resolve();
            const { run, cwd } = cmds[i];
            const cmd = cwd ? `cd ${cwd} && ${run}` : run;
            console.log(`Executing: ${cmd}`);

            conn.exec(cmd, (err, stream) => {
                if (err) return reject(err);
                stream.on("close", (code: number) => {
                    if (code !== 0) return reject(new Error(`Command failed: ${cmd} (Exit code: ${code})`));
                    console.log(`✓ Command completed successfully`);
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
    const host = process.env.SSH_HOST;
    const port = parseInt(process.env.SSH_PORT || "22", 10);
    const username = process.env.SSH_USER;
    const password = process.env.SSH_PASSWORD;

    // Default paths from user request, can be overridden by env vars
    const tempDir = process.env.DEPLOY_TEMP_DIR || "/var/www/temp-gtd";
    const proDir = process.env.DEPLOY_PRO_DIR || "/var/www/gtd-pro/dist/";
    const pm2Name = process.env.PM2_APP_NAME || "gtd-pro";

    if (!host || !username || !password) {
        throw new Error("Missing SSH_HOST, SSH_USER, or SSH_PASSWORD in .env file");
    }

    console.log(`Connecting to ${username}@${host}:${port}...`);

    const conn = new Client();
    await new Promise<void>((resolve, reject) => {
        conn
            .on("ready", () => {
                console.log("Connected via SSH!");
                resolve();
            })
            .on("error", reject)
            .connect({ host, port, username, password });
    });

    // Commands provided by user
    const cmds: Cmd[] = [
        // 1. Clean and update repo in temp dir
        { run: "git fetch origin", cwd: tempDir },
        { run: "git reset --hard origin/main", cwd: tempDir },

        // 2. Install dependencies and build
        { run: "npm install", cwd: tempDir },
        { run: "npm run build", cwd: tempDir },

        // 3. Deploy to production folder
        // Ensure target directory exists just in case
        { run: `mkdir -p ${proDir}` },
        { run: `cp -r dist/* ${proDir}`, cwd: tempDir },

        // 4. Restart application
        { run: `pm2 restart ${pm2Name}` }
    ];

    try {
        await runSequence(conn, cmds);
        console.log("\nDeployment completed successfully! 🚀");
    } catch (error) {
        console.error("\nDeployment failed:", error);
        process.exit(1);
    } finally {
        conn.end();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
