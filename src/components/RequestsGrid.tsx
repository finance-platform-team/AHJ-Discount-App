import { Badge } from './Badge';
import { cx } from '../lib/classNames';
import { formatDateTimeShort } from '../lib/format';
import type { RequestRowViewModel } from '../lib/rowViewModel';
import { AUTHORITY_WITHIN, REQUEST_APPROVED } from '../lib/optionSets';

interface RequestsGridProps {
  rows: RequestRowViewModel[];
  loading?: boolean;
  onReview: (row: RequestRowViewModel) => void;
}

const COLUMNS: { label: string; className?: string }[] = [
  { label: 'Patient Name' },
  { label: 'Patient ID' },
  { label: 'Visit ID' },
  { label: 'Service Name' },
  { label: 'Service Category' },
  { label: 'Service Level' },
  { label: 'Discount %', className: 'num' },
  { label: 'Authorized Limit', className: 'num' },
  { label: 'Discount Amount', className: 'num' },
  { label: 'Bill Total', className: 'num' },
  { label: 'Overage Above Authority', className: 'num' },
  { label: 'Authority Check' },
  { label: 'Authorized By' },
  { label: 'Decision' },
  { label: 'Time Block' },
  { label: 'Entered By' },
  { label: 'Reason' },
  { label: 'Note' },
  { label: 'Created On' },
  { label: 'Action', className: 'col-sticky-end' },
];

const SKELETON_ROWS = 6;

/** Muted em-dash placeholder for empty cells. */
const EMPTY_CELL = <span className="cell-muted">—</span>;

function AuthorityBadge({ row }: { row: RequestRowViewModel }) {
  if (row.evaluation.unmatchedService) {
    return <Badge tone="pending" icon="⚠">Unmatched Service</Badge>;
  }
  return row.evaluation.authorityCheck === AUTHORITY_WITHIN ? (
    <Badge tone="success" icon="✓">Within Authority</Badge>
  ) : (
    <Badge tone="urgent" icon="⚠">Out of Authority</Badge>
  );
}

function DecisionBadge({ row }: { row: RequestRowViewModel }) {
  return row.requestStatus === REQUEST_APPROVED ? (
    <Badge tone="success" icon="✓">Approved</Badge>
  ) : (
    <Badge tone="error" icon="✗">Rejected</Badge>
  );
}

function AuthorizedByCell({ row }: { row: RequestRowViewModel }) {
  const { ambiguousEmployee, unmatchedEmployee } = row.evaluation;
  let flag = null;
  if (ambiguousEmployee) flag = <Badge tone="awaiting">Ambiguous Employee</Badge>;
  else if (unmatchedEmployee) flag = <Badge tone="pending">Unmatched Employee</Badge>;
  return (
    <>
      {row.authorizedByDisplay}
      {flag && <> {flag}</>}
    </>
  );
}

function LockIcon() {
  return (
    <svg
      className="review-btn-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ReviewButton({ row, onReview }: { row: RequestRowViewModel; onReview: (row: RequestRowViewModel) => void }) {
  // Locked rows still open the modal (read-only) so the recorded decision and its comment can be seen.
  const locked = row.decisionLocked;
  return (
    <button
      type="button"
      className={cx('review-btn', locked && 'review-btn-secondary')}
      onClick={() => onReview(row)}
      title={locked ? 'Decision recorded — view details' : undefined}
    >
      {locked ? (
        <>
          <LockIcon />
          View
        </>
      ) : (
        'Review'
      )}
    </button>
  );
}

function SkeletonRows() {
  return Array.from({ length: SKELETON_ROWS }, (_, i) => (
    <tr key={`skeleton-${i}`} className="row-skeleton" aria-hidden="true">
      {COLUMNS.map((_, j) => (
        <td key={j} className={j === COLUMNS.length - 1 ? 'col-sticky-end' : ''}>
          <span className="skeleton-bar" />
        </td>
      ))}
    </tr>
  ));
}

function RequestRow({ row, onReview }: { row: RequestRowViewModel; onReview: (row: RequestRowViewModel) => void }) {
  return (
    <tr className={row.isOutOfAuthority ? 'row-out-of-authority' : ''}>
      <td className="cell-strong">{row.patientName}</td>
      <td className="cell-muted">{row.patientId}</td>
      <td className="cell-muted">{row.visitId}</td>
      <td>{row.serviceName}</td>
      <td>{row.serviceCategory || EMPTY_CELL}</td>
      <td>{row.serviceLevel}</td>
      <td className="num cell-strong">{row.totalDiscountPercent}%</td>
      <td className="num">{row.authorizedLimit != null ? `${row.authorizedLimit}%` : EMPTY_CELL}</td>
      <td className="num">{row.totalDiscountAmount.toLocaleString()}</td>
      <td className="num">{row.billTotal.toLocaleString()}</td>
      <td className={cx('num', !!row.overageAboveAuthority && 'cell-overage')}>
        {row.overageAboveAuthority ? row.overageAboveAuthority.toLocaleString() : EMPTY_CELL}
      </td>
      <td><AuthorityBadge row={row} /></td>
      <td><AuthorizedByCell row={row} /></td>
      <td><DecisionBadge row={row} /></td>
      <td>{row.timeBlock}</td>
      <td>{row.agentName}</td>
      <td className="cell-truncate" title={row.reason}>{row.reason}</td>
      <td className="cell-truncate" title={row.note}>{row.note || EMPTY_CELL}</td>
      <td className="cell-muted">{formatDateTimeShort(row.actualCreatedOn)}</td>
      <td className="col-sticky-end">
        <ReviewButton row={row} onReview={onReview} />
      </td>
    </tr>
  );
}

export function RequestsGrid({ rows, loading, onReview }: RequestsGridProps) {
  let body;
  if (loading) {
    body = <SkeletonRows />;
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={COLUMNS.length} className="grid-empty">
          <div className="grid-empty-title">No requests match these filters</div>
          <div>Try another tab or clear the keyword and dropdown filters.</div>
        </td>
      </tr>
    );
  } else {
    body = rows.map((row) => <RequestRow key={row.id} row={row} onReview={onReview} />);
  }

  return (
    <div className="grid-wrapper">
      <table className="grid">
        <caption className="visually-hidden">Discount requests</caption>
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
