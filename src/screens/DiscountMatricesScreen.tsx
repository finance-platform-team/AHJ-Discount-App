import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMatrixRows } from '../lib/dataSync';
import type { MatrixRowLite } from '../lib/types';
import {
  POSITION_ENTRIES,
  TIME_BLOCK,
  DEFAULT_POSITION_PA,
  TIME_BLOCK_WILDCARD,
  serviceCategoryLabel,
  serviceLevelLabel,
  timeBlockLabel,
} from '../lib/optionSets';
import { deleteAllDiscountLimitMatrixRows, seedDiscountLimitMatrix } from '../lib/seedMatrixData';
import { DevDataActions, type DevDataAction } from '../components/DevDataActions';

const FALLBACK_PA_LIMIT_PERCENT = 10;

const MATRIX_DEV_ACTIONS: DevDataAction[] = [
  { label: 'Seed Data (Dev)', busyLabel: 'Seeding…', doneLabel: 'Seeded', run: seedDiscountLimitMatrix },
  {
    label: 'Delete All (Dev)',
    busyLabel: 'Deleting…',
    doneLabel: 'Deleted',
    confirm:
      'Permanently delete ALL Discount Limit Matrix records from Dataverse?\n\n' +
      'This cannot be undone. Until the matrix is re-entered, every request will be evaluated as Out of Authority.',
    run: deleteAllDiscountLimitMatrixRows,
  },
];

function cellValue(row: MatrixRowLite | undefined): string {
  if (!row) return '';
  if (row.dis_isunlimited) return '∞';
  if (!row.dis_hasauthority) return '–';
  return `${row.dis_authorizedlimitpercent ?? 0}%`;
}

/** Rows sharing a level/time block/category form one table row, one cell per position. */
const groupKey = (r: MatrixRowLite) => `${r.dis_servicelevel}|${r.dis_timeblock}|${r.dis_servicecategory}`;

function groupMatrixRows(rows: MatrixRowLite[]): MatrixRowLite[][] {
  const groups = new Map<string, MatrixRowLite[]>();
  for (const row of rows) {
    const key = groupKey(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return Array.from(groups.values()).sort(([a], [b]) => {
    return (
      (a.dis_servicelevel ?? 0) - (b.dis_servicelevel ?? 0) ||
      (a.dis_servicecategory ?? 0) - (b.dis_servicecategory ?? 0) ||
      (a.dis_timeblock ?? 0) - (b.dis_timeblock ?? 0)
    );
  });
}

function buildBaseRuleText(rows: MatrixRowLite[]): string {
  const paDefault = rows.find((r) => r.dis_position === DEFAULT_POSITION_PA && r.dis_timeblock === TIME_BLOCK_WILDCARD);
  const defaultPct = paDefault?.dis_authorizedlimitpercent ?? FALLBACK_PA_LIMIT_PERCENT;
  const windowLabels = Object.values(TIME_BLOCK).filter((l) => l !== 'Not Time-Restricted');
  return (
    `Default PA limit is ${defaultPct}% unless overridden. ` +
    `Block-time exceptions apply during ${windowLabels.join(', ')} for the relevant Service Categories. ` +
    `Legend: ∞ = unlimited, "–" = not authorized, must escalate.`
  );
}

export function DiscountMatricesScreen() {
  const [matrixRows, setMatrixRows] = useState<MatrixRowLite[]>([]);
  const [loading, setLoading] = useState(true);

  // State is only set once the fetch settles, so this is safe to call straight from an effect.
  const loadRows = useCallback(
    () =>
      fetchMatrixRows()
        .then(setMatrixRows)
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const reloadRows = () => {
    setLoading(true);
    loadRows();
  };

  const groupedRows = useMemo(() => groupMatrixRows(matrixRows), [matrixRows]);
  const baseRuleText = useMemo(() => buildBaseRuleText(matrixRows), [matrixRows]);

  return (
    <div className="screen">
      <div className="screen-body">
        <div className="page-header">
          <p>AHJ Discount Policy (transcribed from the source policy document).</p>
        </div>

        <div className="info-card">
          <h3>Base rule &amp; overrides</h3>
          <p>{baseRuleText}</p>
        </div>

        <div className="info-card">
          <h3>Role key</h3>
          <div className="role-key-row">
            {POSITION_ENTRIES.map((p) => (
              <div key={p.code} className="role-key-item">
                <strong>{p.abbr}</strong> – {p.fullName}
              </div>
            ))}
          </div>
        </div>

        <div className="info-card">
          <h3>Discount Limit Matrix</h3>
          <DevDataActions actions={MATRIX_DEV_ACTIONS} onDone={reloadRows} />
          {loading ? (
            <div className="loading">Loading matrix…</div>
          ) : (
            <div className="grid-wrapper">
              <table className="grid matrix-table">
                <thead>
                  <tr>
                    <th>Service Level</th>
                    <th>Time Block</th>
                    <th>Service Category</th>
                    {POSITION_ENTRIES.map((p) => (
                      <th key={p.code}>{p.abbr}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map((group) => {
                    const first = group[0];
                    return (
                      <tr key={groupKey(first)}>
                        <td>{serviceLevelLabel(first.dis_servicelevel)}</td>
                        <td>{timeBlockLabel(first.dis_timeblock)}</td>
                        <td>{serviceCategoryLabel(first.dis_servicecategory)}</td>
                        {POSITION_ENTRIES.map((p) => (
                          <td key={p.code}>{cellValue(group.find((r) => r.dis_position === p.code))}</td>
                        ))}
                      </tr>
                    );
                  })}
                  {groupedRows.length === 0 && (
                    <tr>
                      <td colSpan={3 + POSITION_ENTRIES.length} className="grid-empty">
                        No matrix rows found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
