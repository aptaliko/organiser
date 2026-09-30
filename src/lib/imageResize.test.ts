import { expect, it } from 'vitest';
import { fitWithin } from './imageResize';

it.each([
  [4000, 3000, 1600, 1600, 1200],
  [3000, 4000, 1600, 1200, 1600],
  [800, 600, 1600, 800, 600],
  [1600, 1600, 1600, 1600, 1600],
  [10000, 10, 1600, 1600, 2],
  [10000, 1, 1600, 1600, 1],
])('%ix%i within %i → %ix%i', (w, h, max, ew, eh) => {
  expect(fitWithin(w, h, max)).toEqual({ width: ew, height: eh });
});
