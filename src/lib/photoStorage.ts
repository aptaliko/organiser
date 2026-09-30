// Where photo files live. Production: Vercel Blob (client-side upload, public URLs with a
// random suffix). Local dev without a Blob token: files under .local-uploads/, served by
// /api/photos/local/[name] behind the auth proxy.
import { del } from '@vercel/blob';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export const LOCAL_DIR = path.join(process.cwd(), '.local-uploads');

export function storageMode(): 'blob' | 'local' {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set — add a Blob store to the Vercel project');
  }
  return 'local';
}

export async function saveLocal(data: Buffer, contentType: string): Promise<string> {
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[contentType] ?? 'bin';
  const name = `${randomUUID()}.${ext}`;
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), data);
  return `/api/photos/local/${name}`;
}

export async function readLocal(name: string): Promise<Buffer | null> {
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(name)) return null;
  return readFile(path.join(LOCAL_DIR, name)).catch(() => null);
}

/** Best-effort removal of files no row references any more; never throws. */
export async function deleteStoredPhotos(urls: string[]) {
  const blobUrls = urls.filter((u) => u.startsWith('https://'));
  const localUrls = urls.filter((u) => u.startsWith('/api/photos/local/'));
  try {
    if (blobUrls.length) await del(blobUrls);
    for (const u of localUrls) await unlink(path.join(LOCAL_DIR, path.basename(u))).catch(() => {});
  } catch (err) {
    console.error('photo cleanup failed', err);
  }
}
