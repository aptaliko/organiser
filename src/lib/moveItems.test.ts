import { describe, expect, it } from 'vitest';
import { MovePlanError, planItemMoves } from './moveItems';

const drill = { id: 1, name: 'Δράπανο', quantity: 1, areaId: 10 };
const batteries = { id: 2, name: 'Μπαταρίες AA', quantity: 12, areaId: 10 };

describe('planItemMoves', () => {
  it('relocates whole items', () => {
    const { ops } = planItemMoves([{ item: drill }, { item: batteries }], 20, [], undefined);
    expect(ops).toEqual([
      { kind: 'relocate', itemId: 1, fromAreaId: 10 },
      { kind: 'relocate', itemId: 2, fromAreaId: 10 },
    ]);
  });

  it('can take items out (target null)', () => {
    expect(planItemMoves([{ item: drill }], null, [], undefined).ops).toEqual([
      { kind: 'relocate', itemId: 1, fromAreaId: 10 },
    ]);
  });

  it('splits a partial quantity', () => {
    expect(planItemMoves([{ item: batteries, quantity: 4 }], 20, [], undefined).ops).toEqual([
      { kind: 'split', fromId: 2, quantity: 4 },
    ]);
  });

  it('skips moves that change nothing', () => {
    expect(planItemMoves([{ item: drill }], 10, [], undefined).ops).toEqual([]);
    expect(planItemMoves([{ item: batteries, quantity: 3 }], 10, [], undefined).ops).toEqual([]);
  });

  it('asks before merging into a same-named item (ignoring case and accents)', () => {
    const target = [{ id: 9, name: 'μπαταριες aa' }];
    const asked = planItemMoves([{ item: batteries, quantity: 4 }, { item: drill }], 20, target, undefined);
    expect(asked.mergeCandidates).toEqual(['Μπαταρίες AA']);
    expect(asked.ops).toEqual([{ kind: 'relocate', itemId: 1, fromAreaId: 10 }]);
  });

  it('merges when asked to', () => {
    const target = [{ id: 9, name: 'Μπαταρίες AA' }];
    expect(planItemMoves([{ item: batteries, quantity: 4 }], 20, target, true).ops).toEqual([
      { kind: 'merge', fromId: 2, intoId: 9, quantity: 4, removesSource: false },
    ]);
    expect(planItemMoves([{ item: batteries }], 20, target, true).ops).toEqual([
      { kind: 'merge', fromId: 2, intoId: 9, quantity: 12, removesSource: true },
    ]);
  });

  it('keeps them separate when told not to merge', () => {
    const target = [{ id: 9, name: 'Μπαταρίες AA' }];
    expect(planItemMoves([{ item: batteries, quantity: 4 }], 20, target, false).ops).toEqual([
      { kind: 'split', fromId: 2, quantity: 4 },
    ]);
  });

  it('never merges an item into another item that is moving with it', () => {
    const twin = { id: 3, name: 'Δράπανο', quantity: 1, areaId: 20 };
    const { ops, mergeCandidates } = planItemMoves([{ item: drill }, { item: twin }], 20, [twin], undefined);
    expect(mergeCandidates).toEqual([]);
    expect(ops).toEqual([{ kind: 'relocate', itemId: 1, fromAreaId: 10 }]);
  });

  it('rejects invalid quantities and duplicates', () => {
    expect(() => planItemMoves([{ item: batteries, quantity: 13 }], 20, [], undefined)).toThrow(MovePlanError);
    expect(() => planItemMoves([{ item: batteries, quantity: 0 }], 20, [], undefined)).toThrow(MovePlanError);
    expect(() => planItemMoves([{ item: batteries, quantity: 1.5 }], 20, [], undefined)).toThrow(MovePlanError);
    expect(() => planItemMoves([{ item: drill }, { item: drill }], 20, [], undefined)).toThrow(MovePlanError);
  });
});
