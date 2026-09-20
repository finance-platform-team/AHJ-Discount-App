import { Badge } from './Badge';
import type { RequestRowViewModel } from '../lib/rowViewModel';
import { AUTHORITY_WITHIN, REQUEST_APPROVED } from '../lib/optionSets';

interface RequestsGridProps {
  rows: RequestRowViewModel[];
  onReview: (row: RequestRowViewModel) => void;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

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

function AuthorizedByCell({ row }: { row: RequestRowViewModel }) {
  if (row.evaluation.ambiguousEmployee) {
    return (
      <>
        {row.authorizedByDisplay} <Badge tone="awaiting">Ambiguous Employee</Badge>
      </>
    );
  }
  if (row.evaluation.unmatchedEmployee) {
    return (
      <>
        {row.authorizedByDisplay} <Badge tone="pending">Unmatched Employee</Badge>
      </>
    );
  }
  return <>{row.authorizedByDisplay}</>;
}

export function RequestsGrid({ rows, onReview }: RequestsGridProps) {
  return (
    <div className="grid-wrapper">
      <table className="grid">
        <thead>
          <tr>
            <th className="checkbox-col"><input type="checkbox" /></th>
            <th>Patient Name</th>
            <th>Patient ID</th>
            <th>Visit ID</th>
            <th>Service Category</th>
            <th>Service Name</th>
            <th>Service Level</th>
            <th>Time Block</th>
            <th>Total Discount %</th>
            <th>Total Discount Amount</th>
            <th>Bill Total</th>
            <th>Authorized Limit</th>
            <th>Overage Above Authority</th>
            <th>Authority Check</th>
            <th>Authorized By</th>
            <th>Entered By</th>
            <th>Reason</th>
            <th>Note</th>
            <th>Decision</th>
            <th>Created On</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.isOutOfAuthority ? 'row-out-of-authority' : ''}>
              <td className="checkbox-col"><input type="checkbox" /></td>
              <td>{row.patientName}</td>
              <td>{row.patientId}</td>
              <td>{row.visitId}</td>
              <td>{row.serviceCategory}</td>
              <td>{row.serviceName}</td>
              <td>{row.serviceLevel}</td>
              <td>{row.timeBlock}</td>
              <td>{row.totalDiscountPercent}%</td>
              <td>{row.totalDiscountAmount.toLocaleString()}</td>
              <td>{row.billTotal.toLocaleString()}</td>
              <td>{row.authorizedLimit != null ? `${row.authorizedLimit}%` : '—'}</td>
              <td>{row.overageAboveAuthority ? row.overageAboveAuthority.toLocaleString() : '—'}</td>
              <td><AuthorityBadge row={row} /></td>
              <td><AuthorizedByCell row={row} /></td>
              <td>{row.agentName}</td>
              <td>{row.reason}</td>
              <td>{row.note}</td>
              <td>
                {row.requestStatus === REQUEST_APPROVED ? (
                  <Badge tone="success" icon="✓">Approved</Badge>
                ) : (
                  <Badge tone="error" icon="✗">Rejected</Badge>
                )}
              </td>
              <td>{formatDate(row.createdOn)}</td>
              <td>
                <button
                  className="review-btn"
                  disabled={row.decisionLocked}
                  onClick={() => onReview(row)}
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={20} className="grid-empty">No requests match this filter.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
