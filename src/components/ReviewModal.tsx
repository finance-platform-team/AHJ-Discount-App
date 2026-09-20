import { useState } from 'react';
import type { RequestRowViewModel } from '../lib/rowViewModel';

interface ReviewModalProps {
  row: RequestRowViewModel;
  onCancel: () => void;
  onReject: (comment: string) => Promise<void>;
  onLeaveApproved: () => Promise<void>;
}

export function ReviewModal({ row, onCancel, onReject, onLeaveApproved }: ReviewModalProps) {
  const [comment, setComment] = useState('');
  const [mode, setMode] = useState<'idle' | 'reject'>('idle');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleReject() {
    if (!comment.trim()) {
      setMode('reject');
      setError('Justification is required to reject this request.');
      return;
    }
    setBusy(true);
    try {
      await onReject(comment);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject request.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLeaveApproved() {
    setBusy(true);
    try {
      await onLeaveApproved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save decision.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Review Decision — {row.request.dis_name}</h2>

        <div className="modal-grid">
          <Field label="Patient Name" value={row.patientName} />
          <Field label="Patient ID" value={row.patientId} />
          <Field label="Visit ID" value={row.visitId} />
          <Field label="Service" value={`${row.serviceCategory || '—'} — ${row.serviceName || '—'}`} />
          <Field label="Service Level" value={row.serviceLevel} />
          <Field label="Time Block" value={row.timeBlock} />
          <Field label="Total Discount %" value={`${row.totalDiscountPercent}%`} />
          <Field label="Total Discount Amount" value={row.totalDiscountAmount.toLocaleString()} />
          <Field label="Bill Total" value={row.billTotal.toLocaleString()} />
          <Field label="Authorized Limit" value={row.authorizedLimit != null ? `${row.authorizedLimit}%` : '—'} />
          <Field label="Overage Above Authority" value={row.overageAboveAuthority ? row.overageAboveAuthority.toLocaleString() : '—'} />
          <Field label="" value="" />
          <Field label="Entered By" value={row.agentName} />
          <Field label="Authorized By" value={row.authorizedByDisplay} />
          <Field label="Created On" value={row.createdOn ? new Date(row.createdOn).toLocaleString() : ''} />
          <Field label="" value="" />
        </div>

        <div className="modal-fullwidth">
          <Field label="Reason" value={row.reason || '—'} block />
        </div>
        <div className="modal-fullwidth">
          <Field label="Note" value={row.note || '—'} block />
        </div>

        <div className="modal-fullwidth">
          <label className="modal-label">Justification</label>
          <textarea
            className="modal-textarea"
            placeholder="Required only if you reject this request…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={busy}
          />
          {mode === 'reject' && error && <div className="modal-error">{error}</div>}
        </div>

        <div className="modal-actions">
          <button className="modal-btn modal-btn-neutral" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="modal-btn modal-btn-reject" onClick={handleReject} disabled={busy}>
            ✗ Reject
          </button>
          <button className="modal-btn modal-btn-approve" onClick={handleLeaveApproved} disabled={busy}>
            ✓ Leave Approved
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, block }: { label: string; value: string; block?: boolean }) {
  if (!label) return <div />;
  return (
    <div className={block ? 'modal-field-block' : 'modal-field'}>
      <div className="modal-field-label">{label}</div>
      <div className="modal-field-value">{value}</div>
    </div>
  );
}
