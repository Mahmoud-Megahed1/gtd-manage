import { Client } from "basic-ftp";

async function listDir(client: Client, dir: string) {
  try {
    await client.cd(dir);
    const items = await client.list();
    console.log(`Listing ${dir}:`);
    for (const it of items) {
      console.log(`${it.type === 1 ? 'DIR ' : 'FILE'} ${it.name}`);
    }
  } catch (e) {
    console.log(`Failed to list ${dir}: ${(e as Error).message}`);
  } finally {
    await client.cd("/");
  }
}

async function main() {
  const host = process.env.FTP_HOST!;
  const user = process.env.FTP_USER!;
  const password = process.env.FTP_PASSWORD!;
  const port = parseInt(process.env.FTP_PORT || "21", 10);
  const dirs = (process.env.FTP_DIRS || "public_html,public_html/domains/gtd-sys.com/public_html").split(",");
  const client = new Client();
  client.ftp.verbose = true;
  try {
    await client.access({ host, user, password, port, secure: false });
    for (const d of dirs) {
      await listDir(client, d);
    }
  } finally {
    client.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
