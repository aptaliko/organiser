import { describe, expect, it } from 'vitest';
import { formatDims, formatLength, formatVolume, parseLength } from './units';

describe('formatLength', () => {
  it.each([
    [45, 'en', '45 cm'],
    [99, 'en', '99 cm'],
    [100, 'en', '1 m'],
    [245, 'en', '2.45 m'],
    [245, 'el', '2,45 m'],
    [1250, 'en', '12.5 m'],
  ] as const)('%i cm (%s) → %s', (cm, locale, out) => {
    expect(formatLength(cm, locale)).toBe(out);
  });
});

describe('formatDims', () => {
  it('null when nothing is set', () => {
    expect(formatDims({ widthCm: null, depthCm: null, heightCm: null })).toBeNull();
  });
  it('small things in cm', () => {
    expect(formatDims({ widthCm: 40, depthCm: 30, heightCm: 25 })).toBe('40 × 30 × 25 cm');
  });
  it('switches everything to metres when any side is ≥ 1 m', () => {
    expect(formatDims({ widthCm: 240, depthCm: 300, heightCm: 60 })).toBe('2.4 × 3 × 0.6 m');
    expect(formatDims({ widthCm: 240, depthCm: 300, heightCm: 260 }, 'el')).toBe('2,4 × 3 × 2,6 m');
  });
  it('marks missing sides', () => {
    expect(formatDims({ widthCm: 40, depthCm: null, heightCm: 25 })).toBe('40 × ? × 25 cm');
  });
});

describe('formatVolume', () => {
  it.each([
    [500, 'en', '500 cm³'],
    [12_500, 'en', '12.5 L'],
    [12_500, 'el', '12,5 L'],
    [99_000, 'en', '99 L'],
    [400_000, 'en', '0.4 m³'],
    [18_720_000, 'en', '18.72 m³'],
    [-250_000, 'en', '-0.25 m³'],
  ] as const)('%i cm³ (%s) → %s', (v, locale, out) => {
    expect(formatVolume(v, locale)).toBe(out);
  });
});

describe('parseLength', () => {
  it.each([
    ['45', 45],
    [' 45 ', 45],
    ['45cm', 45],
    ['45 cm', 45],
    ['45 εκ', 45],
    ['45εκ.', 45],
    ['1.2m', 120],
    ['1,2 m', 120],
    ['1,2 μ', 120],
    ['2.455 m', 246],
    ['450mm', 45],
    ['12.4', 12],
    ['', null],
    ['   ', null],
  ])('%j → %s', (input, out) => {
    expect(parseLength(input)).toBe(out);
  });

  it.each(['abc', '-5', '0', '0.2', '1..2', '12 inches', '3mm'])('%j is invalid', (input) => {
    expect(parseLength(input)).toBeNaN();
  });
});
