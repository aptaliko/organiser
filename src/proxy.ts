import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookieName, verifySessionToken } from '@/lib/auth';

// Paths reachable without a session — auth pages and the endpoints that establish one.
const PUBLIC_PATHS = new Set([
  '/login',
  '/register',
  '/api/login',
  '/api/register',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-icon.png',
]);
const PUBLIC_PREFIXES = ['/invite/', '/icons/'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Never trust a client-supplied identity header, on any path.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-user-id');

  const userId = verifySessionToken(request.cookies.get(getAuthCookieName())?.value);

  if (userId === null) {
    if (isPublic(pathname)) return NextResponse.next({ request: { headers: requestHeaders } });
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  requestHeaders.set('x-user-id', String(userId));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
