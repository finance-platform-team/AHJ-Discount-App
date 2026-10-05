/** Trims and collapses internal whitespace runs to a single space; `''` for missing values. */
export function collapseWhitespace(value: string | null | undefined): string {
  return value ? value.trim().replace(/\s+/g, ' ') : '';
}

/** Shared text normalization used everywhere names/titles are compared across this app. */
export function normalizeText(value: string | null | undefined): string {
  return collapseWhitespace(value).toLowerCase();
}
