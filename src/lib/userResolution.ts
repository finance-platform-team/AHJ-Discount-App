import { normalizeText } from './textUtils';
import type { SystemUserLite, UserResolutionResult } from './types';

// DotCare sometimes prefixes a numeric code onto the name (e.g. "2819-Mr. Mahmoud Allayli") —
// skipped, since it doesn't correspond to anything on the systemuser record to match against.
const NUMERIC_CODE_PREFIX = /^\d+-/;

// Honorifics DotCare sometimes prefixes onto the name (e.g. "Ms. Sahar Ashgar") — stripped before
// tokenizing so they never count as, or block, a name-token match.
const TITLE_PREFIXES = /^(mr|mrs|ms|miss|dr|eng|prof)\.?\s+/i;

function nameTokens(value: string | null | undefined): string[] {
  const withoutCode = (value ?? '').replace(NUMERIC_CODE_PREFIX, '');
  const withoutTitle = withoutCode.replace(TITLE_PREFIXES, '');
  const normalized = normalizeText(withoutTitle);
  return normalized ? normalized.split(' ') : [];
}

// Every request resolves two names against the full systemuser list, so each user's tokens are
// computed once per user object rather than once per comparison.
const userTokenCache = new WeakMap<SystemUserLite, string[]>();

function userNameTokens(user: SystemUserLite): string[] {
  let tokens = userTokenCache.get(user);
  if (!tokens) {
    tokens = nameTokens(user.fullname);
    userTokenCache.set(user, tokens);
  }
  return tokens;
}

/**
 * Resolves a DotCare free-text name (Authorized By, Agent, ...) to the closest systemuser by
 * full-name token overlap (no exact-match requirement, since DotCare's spelling/ordering/
 * honorifics vary from the Dataverse record) — e.g. "Ms. Sahar Ashgar" -> the systemuser whose
 * fullname shares the most tokens ("Sahar Ibrahim Ali Ashgar" shares 2: sahar, ashgar; every
 * other "Sahar ..." shares only 1). A tie between top scorers is ambiguous rather than an
 * arbitrary pick; zero overlap is unmatched.
 */
export function resolveClosestUser(
  raw: string | null | undefined,
  users: SystemUserLite[]
): UserResolutionResult {
  const rawTokens = new Set(nameTokens(raw));
  if (rawTokens.size === 0) return { status: 'unmatched' };

  let bestScore = 0;
  let bestUsers: SystemUserLite[] = [];

  for (const user of users) {
    const overlap = userNameTokens(user).filter((t) => rawTokens.has(t)).length;
    if (overlap === 0) continue;
    if (overlap > bestScore) {
      bestScore = overlap;
      bestUsers = [user];
    } else if (overlap === bestScore) {
      bestUsers.push(user);
    }
  }

  if (bestUsers.length === 0) return { status: 'unmatched' };
  if (bestUsers.length > 1) return { status: 'ambiguous' };
  return { status: 'matched', user: bestUsers[0] };
}
