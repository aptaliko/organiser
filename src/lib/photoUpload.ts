'use client';

import { upload } from '@vercel/blob/client';
import { resizeImage } from './imageResize';
import type { PhotoInput } from './schemas';

let modePromise: Promise<'blob' | 'local'> | null = null;
function uploadMode() {
  modePromise ??= fetch('/api/photos/upload')
    .then((r) => r.json() as Promise<{ mode: 'blob' | 'local' }>)
    .then((d) => d.mode)
    .catch((err) => {
      modePromise = null;
      throw err;
    });
  return modePromise;
}

/** Resizes and uploads one photo; returns what the API needs to attach it. */
export async function uploadPhoto(file: File): Promise<PhotoInput> {
  const { blob, width, height } = await resizeImage(file);
  if ((await uploadMode()) === 'local') {
    const form = new FormData();
    form.append('file', new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
    const res = await fetch('/api/photos/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error('upload failed');
    const { url } = (await res.json()) as { url: string };
    return { url, width, height };
  }
  const result = await upload(`photos/${crypto.randomUUID()}.jpg`, blob, {
    access: 'public',
    handleUploadUrl: '/api/photos/upload',
    contentType: 'image/jpeg',
  });
  return { url: result.url, width, height };
}
