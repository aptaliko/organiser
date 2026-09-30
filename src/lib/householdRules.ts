export interface MemberLike {
  userId: number;
  role: string;
}

export type LeaveCheck = 'ok' | 'only_member' | 'last_owner';

/**
 * Whether `userId` may leave (or be removed from) a household. The last member can't leave —
 * the household's things would belong to nobody — and a household must keep an owner while
 * it has members.
 */
export function checkLeave(members: MemberLike[], userId: number): LeaveCheck {
  const others = members.filter((m) => m.userId !== userId);
  if (others.length === 0) return 'only_member';
  const me = members.find((m) => m.userId === userId);
  if (me?.role === 'owner' && !others.some((m) => m.role === 'owner')) return 'last_owner';
  return 'ok';
}
