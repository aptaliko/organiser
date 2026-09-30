'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { uploadPhoto } from '@/lib/photoUpload';
import type { PhotoInput } from '@/lib/schemas';
import { PhotoStrip } from './PhotoStrip';
import { useToast } from './Toast';

/** Photos for something not created yet: uploaded now, attached when the form is saved. */
export function PendingPhotos({
  value,
  onChange,
}: {
  value: PhotoInput[];
  onChange: Dispatch<SetStateAction<PhotoInput[]>>;
}) {
  const { t } = useT();
  const toast = useToast();
  const [uploading, setUploading] = useState(0);

  async function onFiles(files: File[]) {
    setUploading((n) => n + files.length);
    const results = await Promise.allSettled(files.map((f) => uploadPhoto(f)));
    setUploading((n) => n - files.length);
    const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    if (ok.length < results.length) toast(t('photos.failed'));
    // Functional update: another batch may have finished while this one uploaded.
    onChange((current) => [...current, ...ok]);
  }

  return (
    <PhotoStrip
      photos={value.map((p) => ({ key: p.url, url: p.url }))}
      uploading={uploading}
      onFiles={onFiles}
      onRemove={(key) => onChange((current) => current.filter((p) => p.url !== key))}
      onCover={(key) =>
        onChange((current) => [...current.filter((p) => p.url === key), ...current.filter((p) => p.url !== key)])
      }
    />
  );
}
