// Plans what an item move does to the rows, without touching the database, so the rules
// are unit-tested and the API only has to execute the resulting operations.
import { normalizeForSearch } from './search';

export interface MovableItem {
  id: number;
  name: string;
  quantity: number;
  areaId: number | null;
}

export interface MoveRequestItem {
  item: MovableItem;
  /** How many to move; defaults to all. */
  quantity?: number;
}

export type MoveOp =
  /** The whole row changes place. */
  | { kind: 'relocate'; itemId: number; fromAreaId: number | null }
  /** Part of the quantity becomes a new row in the target (copying details, tags, photos). */
  | { kind: 'split'; fromId: number; quantity: number }
  /** The quantity joins a same-named item already in the target; the source shrinks or goes. */
  | { kind: 'merge'; fromId: number; intoId: number; quantity: number; removesSource: boolean };

export class MovePlanError extends Error {}

const sameName = (a: string, b: string) => normalizeForSearch(a) === normalizeForSearch(b);

/**
 * `targetItems` are the items already in the target place. With `mergeSameName` unset, a
 * same-named item there is reported in `mergeCandidates` (so the UI can ask) and the move
 * proceeds without merging only when it is explicitly `false`.
 */
export function planItemMoves(
  requests: MoveRequestItem[],
  targetAreaId: number | null,
  targetItems: { id: number; name: string }[],
  mergeSameName: boolean | undefined,
): { ops: MoveOp[]; mergeCandidates: string[] } {
  const ops: MoveOp[] = [];
  const mergeCandidates: string[] = [];
  const movingIds = new Set(requests.map((r) => r.item.id));
  if (movingIds.size !== requests.length) throw new MovePlanError('duplicate item');

  for (const { item, quantity = item.quantity } of requests) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity) {
      throw new MovePlanError(`invalid quantity for item ${item.id}`);
    }
    const whole = quantity === item.quantity;
    if (whole && item.areaId === targetAreaId) continue; // already there

    const twin = targetItems.find((t) => t.id !== item.id && !movingIds.has(t.id) && sameName(t.name, item.name));
    if (twin && mergeSameName === undefined) {
      mergeCandidates.push(item.name);
      continue;
    }
    if (twin && mergeSameName) {
      ops.push({ kind: 'merge', fromId: item.id, intoId: twin.id, quantity, removesSource: whole });
    } else if (whole) {
      ops.push({ kind: 'relocate', itemId: item.id, fromAreaId: item.areaId });
    } else {
      if (item.areaId === targetAreaId) continue; // splitting into the same place changes nothing
      ops.push({ kind: 'split', fromId: item.id, quantity });
    }
  }
  return { ops, mergeCandidates };
}
