/** Locale number with up to two decimals (e.g. currency amounts). */
export function formatAmount(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Compact locale date/time for dense tables; `''` for missing or unparseable values. */
export function formatDateTimeShort(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Full locale date/time for detail views; `'—'` when missing. */
export function formatDateTime(iso: string): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}
