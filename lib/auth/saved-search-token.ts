import { createHmac, timingSafeEqual } from 'crypto';

function getSecret(): string {
  const s = process.env.SAVED_SEARCH_TOKEN_SECRET ?? process.env.CRON_SECRET ?? '';
  if (!s) throw new Error('SAVED_SEARCH_TOKEN_SECRET env var is not set');
  return s;
}

/**
 * Sign a token for one-click saved-search unsubscribe links.
 * scope = saved_search UUID for per-search links, or 'all' for bulk unsubscribe.
 */
export function signSavedSearchToken(scope: string, userId: string): string {
  const data = `${scope}:${userId}`;
  return createHmac('sha256', getSecret()).update(data).digest('hex');
}

export function verifySavedSearchToken(
  token: string,
  scope: string,
  userId: string,
): boolean {
  let expected: string;
  try {
    expected = signSavedSearchToken(scope, userId);
  } catch {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
