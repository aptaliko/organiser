import { describe, expect, it } from 'vitest';
import { buildTree, descendantIds, effectiveAddress, formatPath, pathTo, wouldCreateCycle } from './areaTree';

// Warehouse(1) → Room 2(2) → Shelf(3) → Blue box(4); Home(5) → Attic(6)
const areas = [
  { id: 4, parentId: 3, name: 'Blue box', address: null },
  { id: 1, parentId: null, name: 'Warehouse', address: 'Odos 1, Athens' },
  { id: 3, parentId: 2, name: 'Shelf', address: null },
  { id: 2, parentId: 1, name: 'Room 2', address: null },
  { id: 5, parentId: null, name: 'Home', address: '  ' },
  { id: 6, parentId: 5, name: 'Attic', address: null },
  { id: 7, parentId: 1, name: 'Room 10', address: null },
];

describe('buildTree', () => {
  it('nests and sorts siblings by name (numeric-aware)', () => {
    const tree = buildTree(areas);
    expect(tree.map((n) => n.name)).toEqual(['Home', 'Warehouse']);
    expect(tree[1].children.map((n) => n.name)).toEqual(['Room 2', 'Room 10']);
    expect(tree[1].children[0].children[0].children[0].name).toBe('Blue box');
  });

  it('treats areas with a missing parent as roots', () => {
    const tree = buildTree([{ id: 9, parentId: 99, name: 'Orphan' }]);
    expect(tree.map((n) => n.id)).toEqual([9]);
  });

  it('sorts Greek names alphabetically, ignoring accents', () => {
    const tree = buildTree([
      { id: 1, parentId: null, name: 'Ράφι' },
      { id: 2, parentId: null, name: 'Αποθήκη' },
      { id: 3, parentId: null, name: 'Ντουλάπα' },
    ]);
    expect(tree.map((n) => n.name)).toEqual(['Αποθήκη', 'Ντουλάπα', 'Ράφι']);
  });
});

describe('pathTo', () => {
  it('returns root → self', () => {
    expect(pathTo(areas, 4).map((a) => a.id)).toEqual([1, 2, 3, 4]);
    expect(pathTo(areas, 1).map((a) => a.id)).toEqual([1]);
  });
  it('is empty for unknown ids', () => {
    expect(pathTo(areas, 404)).toEqual([]);
  });
  it('does not loop forever on corrupt data', () => {
    const cyclic = [
      { id: 1, parentId: 2, name: 'A' },
      { id: 2, parentId: 1, name: 'B' },
    ];
    expect(pathTo(cyclic, 1).map((a) => a.id)).toEqual([2, 1]);
  });
});

describe('descendantIds / wouldCreateCycle', () => {
  it('collects the subtree including self', () => {
    expect([...descendantIds(areas, 2)].sort()).toEqual([2, 3, 4]);
    expect([...descendantIds(areas, 4)]).toEqual([4]);
  });
  it('rejects moving an area into itself or its descendants', () => {
    expect(wouldCreateCycle(areas, 2, 2)).toBe(true);
    expect(wouldCreateCycle(areas, 2, 4)).toBe(true);
  });
  it('allows moving elsewhere or to the top level', () => {
    expect(wouldCreateCycle(areas, 3, 6)).toBe(false);
    expect(wouldCreateCycle(areas, 4, 1)).toBe(false);
    expect(wouldCreateCycle(areas, 2, null)).toBe(false);
  });
});

describe('effectiveAddress', () => {
  it('inherits the nearest ancestor address', () => {
    expect(effectiveAddress(areas, 4)).toBe('Odos 1, Athens');
  });
  it('ignores blank addresses', () => {
    expect(effectiveAddress(areas, 6)).toBeNull();
  });
});

it('formatPath joins with arrows', () => {
  expect(formatPath(pathTo(areas, 4))).toBe('Warehouse → Room 2 → Shelf → Blue box');
});
