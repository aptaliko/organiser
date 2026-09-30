import { createHash, randomBytes } from 'crypto';

export const INVITE_TTL_DAYS = 7;

/** The raw token goes in the link; only its hash is stored, so a DB leak can't be replayed. */
export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function inviteExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 3600 * 1000);
}

export function isInviteUsable(invite: { expiresAt: Date; revokedAt: Date | null }, now: Date = new Date()): boolean {
  return invite.revokedAt === null && invite.expiresAt.getTime() > now.getTime();
}

/** Tokens from URLs: base64url, fixed length. Rejects junk before touching the DB. */
export function looksLikeInviteToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
