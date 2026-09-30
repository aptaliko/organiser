import { describe, expect, it } from 'vitest';
import { areaUsage, fits, rankPlaces, summarizeItems, usageByArea, volume } from './space';

const d = (w: number | null, dd: number | null, h: number | null) => ({ widthCm: w, depthCm: dd, heightCm: h });
const box = d(100, 50, 40); // 200 000 cm³

describe('volume', () => {
  it('needs all three sides', () => {
    expect(volume(box)).toBe(200_000);
    expect(volume(d(100, null, 40))).toBeNull();
  });
});

describe('summarizeItems', () => {
  it('multiplies by quantity and counts unknowns', () => {
    expect(summarizeItems([{ ...d(10, 10, 10), quantity: 3 }, { ...d(null, 5, 5), quantity: 2 }])).toEqual({
      volume: 3000,
      unknown: 1,
    });
  });
});

describe('areaUsage', () => {
  it('is null-capacity without area dimensions, but still sums what it can', () => {
    const u = areaUsage(d(null, null, null), { volume: 500, unknown: 0 }, []);
    expect(u).toEqual({ capacity: null, used: 500, free: null, percent: null, unknownCount: 0 });
  });

  it('counts child places by their outer volume and flags unknowns', () => {
    const u = areaUsage(box, { volume: 20_000, unknown: 2 }, [d(50, 40, 30), d(null, 1, 1)]);
    expect(u.used).toBe(20_000 + 60_000);
    expect(u.free).toBe(120_000);
    expect(u.percent).toBe(40);
    expect(u.unknownCount).toBe(3);
  });

  it('reports over-full without clamping', () => {
    const u = areaUsage(box, { volume: 260_000, unknown: 0 }, []);
    expect(u.free).toBe(-60_000);
    expect(u.percent).toBe(130);
  });
});

describe('fits', () => {
  const empty = areaUsage(box, { volume: 0, unknown: 0 }, []);

  it('allows any rotation', () => {
    expect(fits(d(40, 100, 10), 1, box, empty)).toEqual({ ok: true });
    expect(fits(d(10, 45, 95), 1, box, empty)).toEqual({ ok: true });
  });

  it('rejects an item longer than the area in some direction', () => {
    expect(fits(d(120, 10, 10), 1, box, empty)).toEqual({ ok: false, reason: 'too-long' });
    expect(fits(d(60, 60, 10), 1, box, empty)).toEqual({ ok: false, reason: 'too-long' });
  });

  it('checks total volume including quantity', () => {
    const half = areaUsage(box, { volume: 100_000, unknown: 0 }, []);
    expect(fits(d(50, 50, 40), 1, box, half)).toEqual({ ok: true }); // exactly 100 000
    expect(fits(d(50, 50, 20), 3, box, half)).toEqual({ ok: false, reason: 'not-enough-space' });
  });

  it('cannot judge without dimensions', () => {
    expect(fits(d(10, null, 10), 1, box, empty)).toEqual({ ok: false, reason: 'unknown-dimensions' });
    expect(fits(d(10, 10, 10), 1, d(null, 1, 1), empty)).toEqual({ ok: false, reason: 'unknown-dimensions' });
  });
});

describe('rankPlaces', () => {
  it('keeps places that fit, emptiest first', () => {
    const mk = (id: number, dims: ReturnType<typeof d>, used: number) => ({
      id,
      dims,
      usage: areaUsage(dims, { volume: used, unknown: 0 }, []),
    });
    const ranked = rankPlaces(d(30, 30, 30), 1, [
      mk(1, box, 0), // free 200 000
      mk(2, d(200, 200, 200), 7_000_000), // free 1 000 000
      mk(3, d(20, 20, 20), 0), // too small
      mk(4, d(40, 40, 40), 40_000), // free 24 000 < 27 000
      mk(5, d(null, null, null), 0), // unknown
    ]);
    expect(ranked.map((r) => r.id)).toEqual([2, 1]);
  });
});

describe('usageByArea', () => {
  it('computes each area from its direct items and children', () => {
    const areas = [
      { id: 1, parentId: null, ...d(200, 100, 100) },
      { id: 2, parentId: 1, ...box },
    ];
    const usage = usageByArea(areas, new Map([[2, { volume: 50_000, unknown: 0 }]]));
    expect(usage.get(1)!.used).toBe(200_000); // the box, not its contents
    expect(usage.get(2)!.percent).toBe(25);
  });
});
