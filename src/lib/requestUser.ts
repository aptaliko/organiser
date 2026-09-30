import { headers } from 'next/headers';

function parseUserId(header: string | null): number {
  const userId = header ? Number(header) : NaN;
  if (!Number.isInteger(userId)) {
    throw new Error('Missing x-user-id header — proxy.ts should have set this for every authenticated request');
  }
  return userId;
}

/** For API route handlers. */
export function getUserId(request: Request): number {
  return parseUserId(request.headers.get('x-user-id'));
}

/** For Server Components / Server Actions. */
export async function currentUserId(): Promise<number> {
  return parseUserId((await headers()).get('x-user-id'));
}

/** Like currentUserId, but null on public pages where the proxy set no identity. */
export async function maybeCurrentUserId(): Promise<number | null> {
  const header = (await headers()).get('x-user-id');
  return header && Number.isInteger(Number(header)) ? Number(header) : null;
}
