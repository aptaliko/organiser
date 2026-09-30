'use client';

import { Capacitor } from '@capacitor/core';
import { useSyncExternalStore } from 'react';

/**
 * True inside the Android app (the Capacitor shell injects its bridge into the live site).
 * Always false during server rendering.
 */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

const subscribe = () => () => {};

/**
 * For rendering: false on the server and during hydration, then the real value — so native-only
 * UI never causes a hydration mismatch.
 */
export function useIsNativeApp(): boolean {
  return useSyncExternalStore(subscribe, isNativeApp, () => false);
}
