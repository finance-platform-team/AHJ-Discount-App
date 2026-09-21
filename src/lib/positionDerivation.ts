import { normalizeText } from './textUtils';
import { DEFAULT_POSITION_PA, POSITION_ENTRIES } from './optionSets';

// Words that appear in several of the 12 position titles ("Manager", "Chief", "Officer"...) —
// a match on one of these alone is too weak to distinguish a position, so it can't win a match
// by itself; it only adds weight once a distinguishing token ("financial", "inpatient", "er"...)
// has already matched.
const GENERIC_TITLE_WORDS = new Set(['manager', 'officer', 'chief', 'director', 'supervisor']);

function titleTokens(value: string | null | undefined): string[] {
  // Strip punctuation ("Deputy Chairman & CEO") so it never counts as its own bogus token.
  const normalized = normalizeText(value).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.split(' ') : [];
}

// An abbreviation hit (title literally contains "CEO", "COO", "FM"...) is a much stronger signal
// than a shared plain-English word, since it's the exact code this app's own position list uses —
// e.g. "Deputy Chairman & CEO" must resolve to CEO even though none of "Chief Executive Officer"'s
// words appear in the title.
const ABBR_MATCH_WEIGHT = 2;

/**
 * Derives the matrix position from the systemuser's free-text `title` by closest token match
 * against the 12 positions' full names and abbreviations — not an exact match, since
 * DotCare/Dataverse job titles rarely spell the policy's position names verbatim. Falls back to
 * PA when nothing distinguishing overlaps (e.g. "Customer Excellence Head" matches none of the 12
 * positions).
 */
export function derivePositionFromTitle(title: string | null | undefined): number {
  const userTokens = new Set(titleTokens(title));
  if (userTokens.size === 0) return DEFAULT_POSITION_PA;

  let bestCode: number | null = null;
  let bestDistinguishingOverlap = 0;
  let bestTotalOverlap = 0;

  for (const entry of POSITION_ENTRIES) {
    let distinguishingOverlap = 0;
    let totalOverlap = 0;

    for (const t of titleTokens(entry.abbr)) {
      if (!userTokens.has(t)) continue;
      totalOverlap += ABBR_MATCH_WEIGHT;
      distinguishingOverlap += ABBR_MATCH_WEIGHT;
    }
    for (const t of titleTokens(entry.fullName)) {
      if (!userTokens.has(t)) continue;
      totalOverlap++;
      if (!GENERIC_TITLE_WORDS.has(t)) distinguishingOverlap++;
    }

    if (distinguishingOverlap === 0) continue;
    if (
      distinguishingOverlap > bestDistinguishingOverlap ||
      (distinguishingOverlap === bestDistinguishingOverlap && totalOverlap > bestTotalOverlap)
    ) {
      bestCode = entry.code;
      bestDistinguishingOverlap = distinguishingOverlap;
      bestTotalOverlap = totalOverlap;
    }
  }

  return bestCode ?? DEFAULT_POSITION_PA;
}
