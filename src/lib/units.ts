// Dimensions are stored as integer centimetres. These helpers format them for people
// (cm for small things, m / L / m³ for big ones) and parse what people type.
import type { Locale } from '@/i18n';

export interface Dims {
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
}

const nf = (locale: Locale, maxFractionDigits: number) =>
  new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-US', { maximumFractionDigits: maxFractionDigits });

/** 45 → "45 cm"; 245 → "2.45 m" (el: "2,45 m"). */
export function formatLength(cm: number, locale: Locale = 'en'): string {
  if (cm < 100) return `${nf(locale, 0).format(cm)} cm`;
  return `${nf(locale, 2).format(cm / 100)} m`;
}

/**
 * "40 × 30 × 25 cm", or all in metres when any side is ≥ 1 m ("2.4 × 3 × 2.6 m").
 * Missing sides show as "?"; null when no side is set at all.
 */
export function formatDims(d: Dims, locale: Locale = 'en'): string | null {
  const sides = [d.widthCm, d.depthCm, d.heightCm];
  if (sides.every((s) => s == null)) return null;
  const metres = sides.some((s) => s != null && s >= 100);
  const fmt = metres ? nf(locale, 2) : nf(locale, 0);
  const parts = sides.map((s) => (s == null ? '?' : fmt.format(metres ? s / 100 : s)));
  return `${parts.join(' × ')} ${metres ? 'm' : 'cm'}`;
}

/** cm³ → "500 cm³" | "12.5 L" (under 100 L) | "0.4 m³". */
export function formatVolume(cm3: number, locale: Locale = 'en'): string {
  const abs = Math.abs(cm3);
  if (abs < 1000) return `${nf(locale, 0).format(cm3)} cm³`;
  if (abs < 100_000) return `${nf(locale, 1).format(cm3 / 1000)} L`;
  return `${nf(locale, 2).format(cm3 / 1_000_000)} m³`;
}

const UNIT_TO_CM: Record<string, number> = { mm: 0.1, cm: 1, m: 100, '': 1 };

/**
 * What a person typed → integer cm. Accepts "45", "45cm", "45 εκ", "1.2m", "1,2 μ", "450mm".
 * Bare numbers are centimetres. Returns null for empty input, NaN for anything unparseable
 * or not positive.
 */
export function parseLength(input: string): number | null {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/εκ\.?$/, 'cm')
    .replace(/χιλ\.?$/, 'mm')
    .replace(/μ\.?$/, 'm');
  if (s === '') return null;
  const match = /^(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?$/.exec(s);
  if (!match) return NaN;
  const value = Number(match[1].replace(',', '.')) * UNIT_TO_CM[match[2] ?? ''];
  const cm = Math.round(value);
  return cm >= 1 ? cm : NaN;
}
