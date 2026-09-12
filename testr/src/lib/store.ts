import fs from "fs";
import path from "path";
import type { DB } from "./types";
import { buildSeed } from "./seed";

const FILE = path.join(
  process.env.VERCEL ? "/tmp" : process.cwd(),
  process.env.VERCEL ? "testr-store.json" : path.join("data", "store.json")
);

const g = globalThis as unknown as {
  __testrDb?: DB;
  __testrMutex?: Promise<void>;
};

function load(): DB {
  if (g.__testrDb) return g.__testrDb;
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as DB;
      if (!parsed.bugReports?.[0] || "console_logs" in parsed.bugReports[0]) {
        g.__testrDb = parsed;
        return g.__testrDb;
      }
    }
  } catch {
    /* fall through */
  }
  g.__testrDb = buildSeed();
  persist();
  return g.__testrDb;
}

export function persist() {
  if (!g.__testrDb) return;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(g.__testrDb));
  } catch {
    /* serverless FS may be read-only outside /tmp */
  }
}

export function db(): DB {
  return load();
}

export function resetDb() {
  g.__testrDb = buildSeed();
  persist();
  return g.__testrDb;
}

export async function tx<T>(fn: (d: DB) => T | Promise<T>): Promise<T> {
  g.__testrMutex = (g.__testrMutex ?? Promise.resolve()).then(async () => {
    /* chain */
  });
  const prev = g.__testrMutex;
  let release: () => void = () => {};
  g.__testrMutex = new Promise<void>((r) => {
    release = r;
  });
  await prev;
  try {
    const d = db();
    const result = await fn(d);
    persist();
    return result;
  } finally {
    release();
  }
}
