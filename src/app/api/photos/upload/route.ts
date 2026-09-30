import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { handle } from '@/lib/http';
import { saveLocal, storageMode } from '@/lib/photoStorage';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

/** Tells the client how to upload: straight to Vercel Blob, or to the local dev store. */
export const GET = handle(async () => NextResponse.json({ mode: storageMode() }));

/**
 * Blob mode: issues a client-upload token (the file goes browser → Blob directly, never
 * through this function). Local mode: accepts the file itself as multipart form data.
 * Both sit behind proxy.ts, so only signed-in users can upload.
 */
export const POST = handle(async (request) => {
  if (storageMode() === 'local') {
    const file = (await request.formData()).get('file');
    if (!(file instanceof File) || !TYPES.includes(file.type) || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
    }
    const url = await saveLocal(Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({ url });
  }

  const body = (await request.json()) as HandleUploadBody;
  const json = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: TYPES,
      maximumSizeInBytes: MAX_BYTES,
      addRandomSuffix: true,
    }),
    // No onUploadCompleted: that callback is a server-to-server POST without our cookie, so
    // the auth proxy would reject it. The client attaches the URL itself once upload resolves.
  });
  return NextResponse.json(json);
});
