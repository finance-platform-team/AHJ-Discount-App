import { normalizeText } from './textUtils';
import type { EmployeeLite, EmployeeResolutionResult } from './types';

const NUMERIC_PREFIX = /^(\d+)-/;

/**
 * Resolves DotCare's raw "Authorized By" string to an hr_employees record.
 * Case A: "<code>-<NAME>" -> match hr_numberofhrcode (never hr_currenthrcode).
 * Case B: plain name -> match normalized hr_fullname; >1 hit is treated as ambiguous, not a guess.
 */
export function resolveAuthorizedBy(
  raw: string | null | undefined,
  employees: EmployeeLite[]
): EmployeeResolutionResult {
  const rawValue = raw ?? '';
  const prefixMatch = NUMERIC_PREFIX.exec(rawValue);

  if (prefixMatch) {
    const code = prefixMatch[1];
    const matches = employees.filter((e) => (e.hr_numberofhrcode ?? '').trim() === code);
    if (matches.length === 1) return { status: 'matched', employee: matches[0] };
    if (matches.length > 1) return { status: 'ambiguous' };
    return { status: 'unmatched' };
  }

  const normalized = normalizeText(rawValue);
  if (!normalized) return { status: 'unmatched' };

  const matches = employees.filter((e) => normalizeText(e.hr_fullname) === normalized);
  if (matches.length === 1) return { status: 'matched', employee: matches[0] };
  if (matches.length > 1) return { status: 'ambiguous' };
  return { status: 'unmatched' };
}
