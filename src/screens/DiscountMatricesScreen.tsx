import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../components/TopBar';
import { fetchMatrixRows } from '../lib/dataSync';
import type { MatrixRowLite } from '../lib/types';
import {
  POSITION_ENTRIES,
  SERVICE_CATEGORY,
  SERVICE_LEVEL,
  TIME_BLOCK,
  DEFAULT_POSITION_PA,
  TIME_BLOCK_WILDCARD,
} from '../lib/optionSets';

function cellValue(row: MatrixRowLite | undefined): string {
  if (!row) return '';
  if (row.dis_isunlimited) return '∞';
  if (!row.dis_hasauthority) return '–';
  return `${row.dis_authorizedlimitpercent ?? 0}%`;
}

export function DiscountMatricesScreen() {
  const [matrixRows, setMatrixRows] = useState<MatrixRowLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatrixRows()
      .then(setMatrixRows)
      .finally(() => setLoading(false));
  }, []);

  const groupedRows = useMemo(() => {
    const key = (r: MatrixRowLite) => `${r.dis_servicelevel}|${r.dis_timeblock}|${r.dis_servicecategory}`;
    const map = new Map<string, MatrixRowLite[]>();
    for (const row of matrixRows) {
      const k = key(row);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(row);
    }
    return Array.from(map.values()).sort((a, b) => {
      const r1 = a[0];
      const r2 = b[0];
      return (
        (r1.dis_servicelevel ?? 0) - (r2.dis_servicelevel ?? 0) ||
        (r1.dis_servicecategory ?? 0) - (r2.dis_servicecategory ?? 0) ||
        (r1.dis_timeblock ?? 0) - (r2.dis_timeblock ?? 0)
      );
    });
  }, [matrixRows]);

  const baseRuleText = useMemo(() => {
    const paDefault = matrixRows.find(
      (r) => r.dis_position === DEFAULT_POSITION_PA && r.dis_timeblock === TIME_BLOCK_WILDCARD
    );
    const defaultPct = paDefault?.dis_authorizedlimitpercent ?? 10;
    const windowLabels = Object.values(TIME_BLOCK).filter((l) => l !== 'Not Time-Restricted');
    return `Default PA limit is ${defaultPct}% unless overridden. Block-time exceptions apply during ${windowLabels.join(
      ', '
    )} for the relevant Service Categories. Legend: ∞ = unlimited, ↑X% = escalation-flagged tier, "–" = not authorized, must escalate.`;
  }, [matrixRows]);

  return (
    <div className="screen">
      <TopBar showCommandBar={false} onRefresh={() => {}} refreshing={false} />
      <div className="screen-body">
        <div className="page-header">
          <h1>Discount Limit Matrices</h1>
          <p>AHJ Discount Policy — Section 6.1 (transcribed from the source policy document).</p>
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
                      <tr key={`${first.dis_servicelevel}|${first.dis_timeblock}|${first.dis_servicecategory}`}>
                        <td>{(SERVICE_LEVEL as Record<number, string>)[first.dis_servicelevel ?? -1] ?? ''}</td>
                        <td>{(TIME_BLOCK as Record<number, string>)[first.dis_timeblock ?? -1] ?? ''}</td>
                        <td>{(SERVICE_CATEGORY as Record<number, string>)[first.dis_servicecategory ?? -1] ?? ''}</td>
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
