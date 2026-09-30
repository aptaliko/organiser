import type { CapacitorConfig } from '@capacitor/cli';

// The Android app is a native shell around the live web app (see docs/android.md): the
// WebView loads ORGANISER_URL, so every web deploy updates the app with no reinstall.
// Unlike glentify there's no static export — Organiser's pages render on the server and
// need a connection anyway. Override the address for a build with ORGANISER_URL=….
const url = (process.env.ORGANISER_URL ?? 'https://organiser-aptaliko.vercel.app').replace(/\/$/, '');

const config: CapacitorConfig = {
  appId: 'com.organiser.app',
  appName: 'Organiser',
  // Only the offline page lives on the device; everything else comes from `url`.
  webDir: 'native-shell',
  server: {
    url,
    errorPath: 'offline.html',
  },
  android: {
    // Lets the web app recognise the shell (e.g. to explain that labels print from a computer).
    appendUserAgent: 'OrganiserAndroid',
  },
};

export default config;
