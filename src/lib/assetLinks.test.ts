import { expect, it } from 'vitest';
import { assetLinks, parseFingerprints } from './assetLinks';

const fp = Array.from({ length: 32 }, (_, i) => (i + 10).toString(16).padStart(2, '0')).join(':');

it('parses comma/space separated fingerprints and drops junk', () => {
  expect(parseFingerprints(`${fp}, nope ${fp.toUpperCase()}`)).toEqual([fp.toUpperCase(), fp.toUpperCase()]);
  expect(parseFingerprints(undefined)).toEqual([]);
  expect(parseFingerprints('AA:BB')).toEqual([]);
});

it('builds the statement only when there is a fingerprint', () => {
  expect(assetLinks([])).toEqual([]);
  expect(assetLinks([fp])[0].target).toEqual({
    namespace: 'android_app',
    package_name: 'com.organiser.app',
    sha256_cert_fingerprints: [fp],
  });
});
