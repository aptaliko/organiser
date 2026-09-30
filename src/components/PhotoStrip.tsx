'use client';

import { useRef } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { CameraIcon, ImageIcon, StarIcon, XIcon } from './icons';

export interface StripPhoto {
  key: string | number;
  url: string;
}

/**
 * Horizontal row of photos (first = cover) plus two big add tiles: "Take photo" opens the
 * rear camera directly on phones, "Choose photo" opens the gallery.
 */
export function PhotoStrip({
  photos,
  uploading,
  onFiles,
  onRemove,
  onCover,
}: {
  photos: StripPhoto[];
  uploading: number;
  onFiles: (files: File[]) => void;
  onRemove: (key: StripPhoto['key']) => void;
  onCover: (key: StripPhoto['key']) => void;
}) {
  const { t } = useT();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow picking the same file again
    if (files.length) onFiles(files);
  };

  const tile = 'flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium';

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {photos.map((p, i) => (
        <div key={p.key} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
          <img src={p.url} alt="" className="h-full w-full object-cover" />
          {i === 0 ? (
            <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {t('photos.cover')}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onCover(p.key)}
              aria-label={t('photos.makeCover')}
              className="absolute bottom-1 left-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
            >
              <StarIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(p.key)}
            aria-label={t('photos.remove')}
            className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
      {Array.from({ length: uploading }, (_, i) => (
        <div key={`up-${i}`} className={`${tile} animate-pulse bg-surface-2 text-muted`}>
          {t('photos.uploading')}
        </div>
      ))}
      <button type="button" onClick={() => cameraRef.current?.click()} className={`${tile} bg-accent-soft text-accent`}>
        <CameraIcon className="h-7 w-7" />
        {t('photos.take')}
      </button>
      <button type="button" onClick={() => galleryRef.current?.click()} className={`${tile} border border-dashed border-border text-muted`}>
        <ImageIcon className="h-7 w-7" />
        {t('photos.choose')}
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={handle} />
    </div>
  );
}
