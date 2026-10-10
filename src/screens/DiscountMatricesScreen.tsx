import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenTextIcon, IdentificationBadgeIcon, InfinityIcon, ProhibitIcon, TableIcon } from '@phosphor-icons/react';
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

// Empty in a production build, so the bulk seed/delete code is never shipped.
const MATRIX_DEV_ACTIONS: DevDataAction[] = !import.meta.env.DEV ? [] : [
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

function MatrixCell({ row }: { row: MatrixRowLite | undefined }) {
  if (!row) return null;
  if (row.dis_isunlimited) {
    return (
      <span className="mx-cell mx-unlimited" title="Unlimited">
        <InfinityIcon weight="bold" aria-label="Unlimited" />
      </span>
    );
  }
  if (!row.dis_hasauthority) {
    return (
      <span className="mx-cell mx-none" title="Not authorized, must escalate">
        <ProhibitIcon aria-label="Not authorized" />
      </span>
    );
  }
  const pct = row.dis_authorizedlimitpercent ?? 0;
  // Tint grows with the limit so high-authority cells stand out when scanning the matrix.
  return (
    <span className="mx-cell mx-pct" style={{ ['--heat' as string]: `${Math.min(pct, 100)}%` }}>
      {pct}%
    </span>
  );
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
    `Block-time exceptions apply during ${windowLabels.join(', ')} for the relevant Service Categories.`
  );
}

interface DiscountMatricesScreenProps {
  /** Seeding/deleting rewrites the whole policy matrix, so it is only offered to full-access users. */
  canManageData: boolean;
}

export function DiscountMatricesScreen({ canManageData }: DiscountMatricesScreenProps) {
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
        <div className="mx-top">
          <section className="panel panel-dark">
            <header className="panel-head">
              <span className="panel-icon">
                <BookOpenTextIcon />
              </span>
              <h2 className="panel-title">Base rule &amp; overrides</h2>
            </header>
            <p className="panel-lead">{baseRuleText}</p>
          </section>

          <section className="panel">
            <header className="panel-head">
              <span className="panel-icon">
                <IdentificationBadgeIcon />
              </span>
              <h2 className="panel-title">Role key</h2>
            </header>
            <div className="role-key-row">
              {POSITION_ENTRIES.map((p) => (
                <div key={p.code} className="role-key-item">
                  <span className="role-key-abbr">{p.abbr}</span>
                  <span className="role-key-name">{p.fullName}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="table-card">
          <header className="table-card-head">
            <div className="panel-head">
              <span className="panel-icon">
                <TableIcon />
              </span>
              <h2 className="panel-title">Discount Limit Matrix</h2>
            </div>
            <div className="mx-legend" aria-label="Legend">
              <span className="mx-legend-item">
                <span className="mx-cell mx-unlimited">
                  <InfinityIcon weight="bold" aria-hidden="true" />
                </span>
                Unlimited
              </span>
              <span className="mx-legend-item">
                <span className="mx-cell mx-none">
                  <ProhibitIcon aria-hidden="true" />
                </span>
                Not authorized, must escalate
              </span>
              <span className="mx-legend-item">
                <span className="mx-cell mx-pct" style={{ ['--heat' as string]: '60%' }}>%</span>
                Limit, tinted by size
              </span>
            </div>
          </header>
          <DevDataActions actions={canManageData ? MATRIX_DEV_ACTIONS : []} onDone={reloadRows} />
          <div className="grid-wrapper">
            <table className="grid matrix-table">
              <caption className="visually-hidden">Discount limit matrix by position</caption>
              <thead>
                <tr>
                  <th>Service Level</th>
                  <th>Time Block</th>
                  <th>Service Category</th>
                  {POSITION_ENTRIES.map((p) => (
                    <th key={p.code} className="mx-col" title={p.fullName}>
                      {p.abbr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 6 }, (_, i) => (
                    <tr key={`skeleton-${i}`} className="row-skeleton" aria-hidden="true">
                      {Array.from({ length: 3 + POSITION_ENTRIES.length }, (_, j) => (
                        <td key={j}>
                          <span className="skeleton-bar" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {!loading &&
                  groupedRows.map((group) => {
                    const first = group[0];
                    return (
                      <tr key={groupKey(first)}>
                        <td className="cell-strong">{serviceLevelLabel(first.dis_servicelevel)}</td>
                        <td>{timeBlockLabel(first.dis_timeblock)}</td>
                        <td>{serviceCategoryLabel(first.dis_servicecategory)}</td>
                        {POSITION_ENTRIES.map((p) => (
                          <td key={p.code} className="mx-col">
                            <MatrixCell row={group.find((r) => r.dis_position === p.code)} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                {!loading && groupedRows.length === 0 && (
                  <tr>
                    <td colSpan={3 + POSITION_ENTRIES.length} className="grid-empty">
                      <div className="grid-empty-title">No matrix rows found</div>
                      <div>The discount policy has not been entered in Dataverse yet.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
