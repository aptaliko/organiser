import { expect, it } from 'vitest';
import { checkLeave } from './householdRules';

const owner = { userId: 1, role: 'owner' };
const member = { userId: 2, role: 'member' };

it('the only member cannot leave', () => {
  expect(checkLeave([owner], 1)).toBe('only_member');
});
it('the last owner cannot leave while others remain', () => {
  expect(checkLeave([owner, member], 1)).toBe('last_owner');
});
it('members can leave, and owners can when another owner remains', () => {
  expect(checkLeave([owner, member], 2)).toBe('ok');
  expect(checkLeave([owner, { userId: 3, role: 'owner' }], 1)).toBe('ok');
});
