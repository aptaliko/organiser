// Client-side: shrink phone photos (often 4000px, 3–8 MB) before upload, so uploads are
// quick on mobile data and storage stays small. Browser-only apart from fitWithin().

/** Scales (w, h) down to fit `maxEdge` on the long side, never up. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
}

export async function resizeImage(file: Blob, maxEdge = 1600, quality = 0.82): Promise<ResizedImage> {
  // createImageBitmap honours EXIF orientation, so portrait phone photos stay upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('image encoding failed');
  return { blob, width, height };
}
