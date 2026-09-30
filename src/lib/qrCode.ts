import { randomInt } from 'crypto';

// No 0/O, 1/I/L: codes are also printed as text on labels and may be typed by hand.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const QR_CODE_LENGTH = 6; // 31^6 ≈ 887M codes

export function generateQrCode(): string {
  let code = '';
  for (let i = 0; i < QR_CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export function isQrCode(value: string): boolean {
  return value.length === QR_CODE_LENGTH && [...value].every((c) => ALPHABET.includes(c));
}
