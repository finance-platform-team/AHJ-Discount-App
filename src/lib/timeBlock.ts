import { TIME_BLOCK } from './optionSets';

/**
 * Derives the request's time-of-day bucket from dis_actualcreatedon, identically for every
 * service level. Returns undefined (no specific bucket) outside 09:00-20:00, letting the
 * matrix lookup fall back to the "Not Time-Restricted" wildcard row.
 */
export function deriveTimeBlock(actualCreatedOn: string | null | undefined): number | undefined {
  if (!actualCreatedOn) return undefined;
  const date = new Date(actualCreatedOn);
  if (Number.isNaN(date.getTime())) return undefined;
  const hour = date.getHours();

  if (hour >= 9 && hour < 13) {
    return findCodeByLabel('09:00 AM–1:00 PM');
  }
  if (hour >= 13 && hour < 17) {
    return findCodeByLabel('1:00 PM–5:00 PM');
  }
  if (hour >= 17 && hour < 20) {
    return findCodeByLabel('5:00 PM–8:00 PM');
  }
  return undefined;
}

function findCodeByLabel(label: string): number | undefined {
  const entry = Object.entries(TIME_BLOCK).find(([, l]) => l === label);
  return entry ? Number(entry[0]) : undefined;
}
