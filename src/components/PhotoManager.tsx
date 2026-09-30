'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { uploadPhoto } from '@/lib/photoUpload';
import { PhotoStrip } from './PhotoStrip';
import { useToast } from './Toast';

/** Photos of an existing area/item: every change is saved immediately. */
export function PhotoManager({
  owner,
  photos,
}: {
  owner: { areaId: number } | { itemId: number };
  photos: { id: number; url: string }[];
}) {
  const { t } = useT();
  const toast = useToast();
  const router = useRouter();
  const [uploading, setUploading] = useState(0);

  async function call(url: string, init: RequestInit) {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
  }

  async function onFiles(files: File[]) {
    setUploading((n) => n + files.length);
    let failed = false;
    await Promise.all(
      files.map(async (f) => {
        try {
          const photo = await uploadPhoto(f);
          await call('/api/photos', { method: 'POST', body: JSON.stringify({ ...owner, ...photo }) });
        } catch {
          failed = true;
        }
      }),
    );
    setUploading((n) => n - files.length);
    if (failed) toast(t('photos.failed'));
    router.refresh();
  }

  async function run(fn: () => Promise<void>) {
    try {
      await fn();
    } catch {
      toast(t('common.error'));
    }
    router.refresh();
  }

  return (
    <PhotoStrip
      photos={photos.map((p) => ({ key: p.id, url: p.url }))}
      uploading={uploading}
      onFiles={onFiles}
      onRemove={(id) => run(() => call(`/api/photos/${id}`, { method: 'DELETE' }))}
      onCover={(id) => run(() => call(`/api/photos/${id}`, { method: 'PATCH', body: JSON.stringify({ cover: true }) }))}
    />
  );
}
