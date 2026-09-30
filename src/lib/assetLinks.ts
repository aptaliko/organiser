export const ANDROID_PACKAGE = 'com.organiser.app';

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/** "AA:BB:…, cc:dd:…" (the ANDROID_CERT_SHA256 variable) → valid, upper-cased SHA-256 fingerprints. */
export function parseFingerprints(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[\s,]+/)
    .map((f) => f.trim().toUpperCase())
    .filter((f) => FINGERPRINT.test(f));
}

/** Digital Asset Links statement letting the app open this site's links. */
export function assetLinks(fingerprints: string[]) {
  if (fingerprints.length === 0) return [];
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints },
    },
  ];
}
