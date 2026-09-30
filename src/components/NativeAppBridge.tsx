'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isNativeApp } from '@/lib/nativeApp';

/**
 * Android app only: when a QR label (/a/CODE) or invite link opens the app, show that page.
 * Covers both a running app (appUrlOpen) and a cold start (getLaunchUrl). Renders nothing.
 */
export function NativeAppBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    let remove: (() => void) | undefined;

    const open = (raw: string | undefined) => {
      if (!raw) return;
      try {
        const url = new URL(raw);
        if (url.host !== window.location.host) return;
        const path = url.pathname + url.search;
        if (path !== window.location.pathname + window.location.search) router.push(path);
      } catch {
        // not a URL we handle
      }
    };

    void import('@capacitor/app')
      .then(async ({ App }) => {
        if (cancelled) return;
        const launch = await App.getLaunchUrl();
        // A launch URL stays set for the app's lifetime; handle it once per app start.
        if (launch?.url && sessionStorage.getItem('organiser:launch-url') !== launch.url) {
          sessionStorage.setItem('organiser:launch-url', launch.url);
          open(launch.url);
        }
        const handle = await App.addListener('appUrlOpen', ({ url }) => open(url));
        remove = () => void handle.remove();
        if (cancelled) remove();
      })
      // Links then just open the home screen; nothing else depends on this.
      .catch((err) => console.warn('App Links bridge unavailable', err));

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  return null;
}
