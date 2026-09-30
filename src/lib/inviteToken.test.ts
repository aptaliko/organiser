import { describe, expect, it } from 'vitest';
import { generateInviteToken, hashInviteToken, inviteExpiry, isInviteUsable, looksLikeInviteToken } from './inviteToken';

describe('invite tokens', () => {
  it('are random, URL-safe and recognisable', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(looksLikeInviteToken(a)).toBe(true);
    expect(looksLikeInviteToken('short')).toBe(false);
    expect(looksLikeInviteToken(a.slice(0, 42) + '/')).toBe(false);
  });

  it('hash deterministically to hex', () => {
    expect(hashInviteToken('abc')).toBe(hashInviteToken('abc'));
    expect(hashInviteToken('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken('abc')).not.toBe(hashInviteToken('abd'));
  });

  it('expire after 7 days or when revoked', () => {
    const now = new Date('2026-09-30T12:00:00Z');
    const expiresAt = inviteExpiry(now);
    expect(expiresAt.toISOString()).toBe('2026-10-07T12:00:00.000Z');
    expect(isInviteUsable({ expiresAt, revokedAt: null }, now)).toBe(true);
    expect(isInviteUsable({ expiresAt, revokedAt: now }, now)).toBe(false);
    expect(isInviteUsable({ expiresAt, revokedAt: null }, new Date('2026-10-08T00:00:00Z'))).toBe(false);
  });
});
