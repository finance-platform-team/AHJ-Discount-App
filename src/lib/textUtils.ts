/** Shared text normalization used everywhere names/titles are compared across this app. */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
