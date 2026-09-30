// Free-space estimates. Volume-based and deliberately approximate: boxes don't pack
// perfectly, so the UI calls these "~" figures. All values in cm / cm³.
import type { Dims } from './units';

export function volume(d: Dims): number | null {
  return d.widthCm && d.depthCm && d.heightCm ? d.widthCm * d.depthCm * d.heightCm : null;
}

export interface ItemSummary {
  /** Σ volume × quantity over items that have all three dimensions. */
  volume: number;
  /** Item rows missing a dimension (not counted in `volume`). */
  unknown: number;
}

export function summarizeItems(items: (Dims & { quantity: number })[]): ItemSummary {
  let total = 0;
  let unknown = 0;
  for (const item of items) {
    const v = volume(item);
    if (v === null) unknown++;
    else total += v * item.quantity;
  }
  return { volume: total, unknown };
}

export interface Usage {
  capacity: number | null;
  used: number;
  /** capacity − used; negative when over-full; null without area dimensions. */
  free: number | null;
  /** Not clamped: 130 means over-full. */
  percent: number | null;
  /** Items and child places without dimensions — the estimate may be low. */
  unknownCount: number;
}

/**
 * Space used in an area by what is *directly* inside it: its items (volume × quantity) and
 * the outer volume of its child places. A box's own contents aren't counted again — the
 * box already occupies that space.
 */
export function areaUsage(area: Dims, items: ItemSummary, children: Dims[]): Usage {
  const capacity = volume(area);
  let used = items.volume;
  let unknownCount = items.unknown;
  for (const child of children) {
    const v = volume(child);
    if (v === null) unknownCount++;
    else used += v;
  }
  return {
    capacity,
    used,
    free: capacity === null ? null : capacity - used,
    percent: capacity === null ? null : (used / capacity) * 100,
    unknownCount,
  };
}

export type FitResult =
  | { ok: true }
  | { ok: false; reason: 'unknown-dimensions' | 'too-long' | 'not-enough-space' };

const sortedDesc = (d: Dims) => [d.widthCm!, d.depthCm!, d.heightCm!].sort((a, b) => b - a);

/**
 * Would `quantity` of this item fit in the area? Each piece must fit in some rotation
 * (compare sorted sides), and the total volume must fit in the free space.
 */
export function fits(item: Dims, quantity: number, area: Dims, usage: Usage): FitResult {
  if (volume(item) === null || volume(area) === null) return { ok: false, reason: 'unknown-dimensions' };
  const a = sortedDesc(area);
  if (sortedDesc(item).some((side, i) => side > a[i])) return { ok: false, reason: 'too-long' };
  if (usage.free !== null && volume(item)! * quantity > usage.free) return { ok: false, reason: 'not-enough-space' };
  return { ok: true };
}

/** Candidate places where the item fits, emptiest (most free volume) first. */
export function rankPlaces<T extends { id: number; dims: Dims; usage: Usage }>(
  item: Dims,
  quantity: number,
  candidates: T[],
): T[] {
  return candidates
    .filter((c) => fits(item, quantity, c.dims, c.usage).ok)
    .sort((x, y) => (y.usage.free ?? 0) - (x.usage.free ?? 0));
}

/** Usage for every area at once, from per-area item summaries (one query) and the area list. */
export function usageByArea(
  areas: (Dims & { id: number; parentId: number | null })[],
  itemsByArea: Map<number, ItemSummary>,
): Map<number, Usage> {
  const children = new Map<number, Dims[]>();
  for (const a of areas) {
    if (a.parentId !== null) children.set(a.parentId, [...(children.get(a.parentId) ?? []), a]);
  }
  return new Map(
    areas.map((a) => [a.id, areaUsage(a, itemsByArea.get(a.id) ?? { volume: 0, unknown: 0 }, children.get(a.id) ?? [])]),
  );
}
