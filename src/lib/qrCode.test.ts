import { expect, it } from 'vitest';
import { generateQrCode, isQrCode } from './qrCode';

it('generates valid, varied codes without ambiguous characters', () => {
  const codes = new Set(Array.from({ length: 500 }, generateQrCode));
  expect(codes.size).toBeGreaterThan(495);
  for (const code of codes) {
    expect(isQrCode(code)).toBe(true);
    expect(code).not.toMatch(/[01OIL]/);
  }
});

it('rejects malformed codes', () => {
  expect(isQrCode('ABC')).toBe(false);
  expect(isQrCode('ABCDE0')).toBe(false);
  expect(isQrCode('abcdef')).toBe(false);
});
