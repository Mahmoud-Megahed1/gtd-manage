import fs from "fs";
import path from "path";

const dir = path.resolve(process.cwd(), ".demo_store");

function ensureDir() {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
}

function filePath(name: string) {
  ensureDir();
  return path.join(dir, `${name}.json`);
}

function read(name: string): any[] {
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return [];
  try {
    const raw = fs.readFileSync(fp, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function write(name: string, items: any[]) {
  const fp = filePath(name);
  fs.writeFileSync(fp, JSON.stringify(items, null, 2), "utf-8");
}

function nextId(items: any[]): number {
  const max = items.reduce((m, it) => (typeof it.id === "number" && it.id > m ? it.id : m), 0);
  return max + 1;
}

export function list(name: string): any[] {
  return read(name);
}

export function insert(name: string, item: any): any {
  const items = read(name);
  const id = nextId(items);
  const now = new Date();
  const rec = { ...item, id, createdAt: item.createdAt ?? now, updatedAt: item.updatedAt ?? now };
  items.push(rec);
  write(name, items);
  return rec;
}

export function update(name: string, id: number, data: any): void {
  const items = read(name);
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], ...data, updatedAt: new Date() };
  write(name, items);
}

export function remove(name: string, id: number): void {
  const items = read(name).filter((it) => it.id !== id);
  write(name, items);
}

export function findById(name: string, id: number): any | null {
  const items = read(name);
  const found = items.find((it) => it.id === id);
  return found ?? null;
}

export function filter(name: string, predicate: (it: any) => boolean): any[] {
  return read(name).filter(predicate);
}

export { write };
