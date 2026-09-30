import { NextResponse } from 'next/server';
import { assetLinks, parseFingerprints } from '@/lib/assetLinks';

/** Served at /.well-known/assetlinks.json (rewrite in next.config.ts); public via proxy.ts. */
export function GET() {
  return NextResponse.json(assetLinks(parseFingerprints(process.env.ANDROID_CERT_SHA256)), {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
