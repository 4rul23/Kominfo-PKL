import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const APP_STATE_DIR = path.join(process.cwd(), "storage", "app-state");

function toStateFilePath(key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return path.join(APP_STATE_DIR, `${safeKey}.json`);
}

export async function readAppStateFile<T>(key: string, fallback: T): Promise<T> {
  try {
    const filePath = toStateFilePath(key);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export async function writeAppStateFile<T>(key: string, payload: T): Promise<void> {
  await mkdir(APP_STATE_DIR, { recursive: true });
  const filePath = toStateFilePath(key);
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}
