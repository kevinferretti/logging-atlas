import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Where uploaded files live. In production this is the persistent volume. */
export function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

function sanitize(name: string): string {
  const base = name.split(/[\\/]/).pop() || "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  return cleaned.slice(-80) || "file";
}

export interface SavedUpload {
  fileName: string;
  fileKey: string;
  fileType: string;
}

export async function saveUpload(file: File): Promise<SavedUpload> {
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const key = `${randomUUID()}-${sanitize(file.name)}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, key), buf);
  return { fileName: file.name, fileKey: key, fileType: file.type || "application/octet-stream" };
}

// Keys are random-uuid prefixed; reject anything that could escape the dir.
const KEY_RE = /^[A-Za-z0-9._-]+$/;
export function isValidKey(key: string): boolean {
  return KEY_RE.test(key) && !key.includes("..");
}
export function uploadPath(key: string): string {
  return path.join(uploadDir(), key);
}
