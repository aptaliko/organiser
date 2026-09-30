import { readLocal } from '@/lib/photoStorage';

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function GET(_request: Request, ctx: RouteContext<'/api/photos/local/[name]'>) {
  const { name } = await ctx.params;
  const data = await readLocal(name);
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': TYPES[name.split('.').pop()!] ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
