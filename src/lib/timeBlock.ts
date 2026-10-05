import { TIME_BLOCK } from './optionSets';

function findCodeByLabel(label: string): number | undefined {
  const entry = Object.entries(TIME_BLOCK).find(([, l]) => l === label);
  return entry ? Number(entry[0]) : undefined;
}

/** Hour windows `[fromHour, toHour)` mapped to their time-block option code, resolved once at load. */
const TIME_WINDOWS = [
  { fromHour: 9, toHour: 13, code: findCodeByLabel('09:00 AM–1:00 PM') },
  { fromHour: 13, toHour: 17, code: findCodeByLabel('1:00 PM–5:00 PM') },
  { fromHour: 17, toHour: 20, code: findCodeByLabel('5:00 PM–8:00 PM') },
];

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
  return TIME_WINDOWS.find((w) => hour >= w.fromHour && hour < w.toHour)?.code;
}
