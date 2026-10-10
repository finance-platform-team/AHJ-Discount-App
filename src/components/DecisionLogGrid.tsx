import { CheckIcon, WarningIcon, XIcon } from '@phosphor-icons/react';
import { Badge } from './Badge';
import { formatDateTimeShort } from '../lib/format';
import { REQUEST_REJECTED } from '../lib/optionSets';
import { overagePercent, serviceSummary } from '../lib/decisionLog';
import type { RequestRowViewModel } from '../lib/rowViewModel';

interface DecisionLogGridProps {
  rows: RequestRowViewModel[];
  loading?: boolean;
}

const COLUMNS: { label: string; className?: string }[] = [
  { label: 'TXN ID' },
  { label: 'Patient Name' },
  { label: 'Patient ID' },
  { label: 'Visit ID' },
  { label: 'Service' },
  { label: 'Discount %', className: 'num' },
  { label: 'Authorized Limit', className: 'num' },
  { label: 'Overage', className: 'num' },
  { label: 'Decision' },
  { label: 'Decision By' },
  { label: 'Role' },
  { label: 'Comment' },
  { label: 'Flag' },
  { label: 'Decision Date' },
];

const SKELETON_ROWS = 4;

const EMPTY_CELL = <span className="cell-empty">-</span>;

function DecisionRow({ row }: { row: RequestRowViewModel }) {
  const overage = overagePercent(row);
  return (
    <tr>
      <td className="cell-muted">{row.request.dis_name || EMPTY_CELL}</td>
      <td className="cell-strong">{row.patientName}</td>
      <td className="cell-muted">{row.patientId}</td>
      <td className="cell-muted">{row.visitId}</td>
      <td title={row.serviceName}>{serviceSummary(row) || EMPTY_CELL}</td>
      <td className="num cell-strong">{row.totalDiscountPercent}%</td>
      <td className="num">{row.authorizedLimit != null ? `${row.authorizedLimit}%` : EMPTY_CELL}</td>
      <td className={overage > 0 ? 'num cell-overage' : 'num'}>{overage > 0 ? `${overage}%` : EMPTY_CELL}</td>
      <td>
        {row.requestStatus === REQUEST_REJECTED ? (
          <Badge tone="error" icon={<XIcon weight="bold" />}>Rejected</Badge>
        ) : (
          <Badge tone="success" icon={<CheckIcon weight="bold" />}>Approved</Badge>
        )}
      </td>
      <td>{row.decidedByName || EMPTY_CELL}</td>
      <td>{row.decidedByRole || EMPTY_CELL}</td>
      <td className="cell-wrap">{row.decisionComment || EMPTY_CELL}</td>
      <td>{row.isOutOfAuthority ? <Badge tone="urgent" icon={<WarningIcon weight="bold" />}>Violation</Badge> : EMPTY_CELL}</td>
      <td className="cell-muted">{formatDateTimeShort(row.decisionDate)}</td>
    </tr>
  );
}

export function DecisionLogGrid({ rows, loading }: DecisionLogGridProps) {
  let body;
  if (loading) {
    body = Array.from({ length: SKELETON_ROWS }, (_, i) => (
      <tr key={`skeleton-${i}`} className="row-skeleton" aria-hidden="true">
        {COLUMNS.map((_, j) => (
          <td key={j}>
            <span className="skeleton-bar" />
          </td>
        ))}
      </tr>
    ));
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={COLUMNS.length} className="grid-empty">
          <div className="grid-empty-title">No decisions to show</div>
          <div>Decisions on requests you entered will appear here once they are approved or rejected.</div>
        </td>
      </tr>
    );
  } else {
    body = rows.map((row) => <DecisionRow key={row.id} row={row} />);
  }

  return (
    <div className="grid-wrapper">
      <table className="grid">
        <caption className="visually-hidden">Decisions on requests you entered</caption>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.label} className={col.className}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
