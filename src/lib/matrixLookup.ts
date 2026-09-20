import { STATUSCODE_ACTIVE, TIME_BLOCK_WILDCARD } from './optionSets';
import type { MatrixMatchResult, MatrixRowLite } from './types';

/**
 * BRL-001 two-tier match: try the specific derived time bucket first (Tier 1), and only fall
 * back to the "Not Time-Restricted" wildcard row (Tier 2) when Tier 1 finds nothing — a
 * wildcard row applies at any time of day, it is not limited to "outside all windows".
 */
export function findMatrixRule(
  rows: MatrixRowLite[],
  params: { serviceLevel?: number; timeBlock?: number; serviceCategory?: number; position: number }
): MatrixMatchResult {
  const { serviceLevel, timeBlock, serviceCategory, position } = params;

  const activeRows = rows.filter((r) => r.statuscode === STATUSCODE_ACTIVE || r.statuscode == null);

  const baseMatch = (r: MatrixRowLite) =>
    r.dis_servicelevel === serviceLevel &&
    r.dis_servicecategory === serviceCategory &&
    r.dis_position === position;

  if (timeBlock != null) {
    const specific = activeRows.find((r) => baseMatch(r) && r.dis_timeblock === timeBlock);
    if (specific) return { tier: 'specific', row: specific };
  }

  const wildcard = activeRows.find((r) => baseMatch(r) && r.dis_timeblock === TIME_BLOCK_WILDCARD);
  if (wildcard) return { tier: 'wildcard', row: wildcard };

  return { tier: 'none' };
}
