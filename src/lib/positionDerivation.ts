import { normalizeText } from './textUtils';
import { DEFAULT_POSITION_PA, POSITION_ENTRIES } from './optionSets';

/**
 * Defaults to PA. Upgraded only on an exact (trim/collapse/case-insensitive) match of
 * hr_positionname against one of the 12 matrix position full names — no partial/fuzzy matching.
 */
export function derivePosition(hrPositionName: string | null | undefined): number {
  const normalized = normalizeText(hrPositionName);
  if (!normalized) return DEFAULT_POSITION_PA;
  const entry = POSITION_ENTRIES.find((e) => normalizeText(e.fullName) === normalized);
  return entry?.code ?? DEFAULT_POSITION_PA;
}
