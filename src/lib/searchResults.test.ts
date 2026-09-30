import { expect, it } from 'vitest';
import { locate } from './searchResults';

const byId = new Map(
  [
    { id: 1, parentId: null, name: 'Warehouse', coverUrl: 'w.jpg' },
    { id: 2, parentId: 1, name: 'Room 2', coverUrl: null },
    { id: 3, parentId: 2, name: 'Blue box', coverUrl: null },
  ].map((a) => [a.id, a]),
);

it('builds the path and prefers the item photo', () => {
  expect(locate(byId, 3, 'item.jpg')).toEqual({
    path: [
      { id: 1, name: 'Warehouse' },
      { id: 2, name: 'Room 2' },
      { id: 3, name: 'Blue box' },
    ],
    thumbUrl: 'item.jpg',
    thumbIsPlace: false,
  });
});

it('falls back to the nearest place photo up the path', () => {
  expect(locate(byId, 3, null)).toMatchObject({ thumbUrl: 'w.jpg', thumbIsPlace: true });
});

it('handles unplaced items', () => {
  expect(locate(byId, null, null)).toEqual({ path: [], thumbUrl: null, thumbIsPlace: false });
});
