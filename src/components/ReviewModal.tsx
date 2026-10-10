import { useState, type ReactNode } from 'react';
import {
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CurrencyCircleDollarIcon,
  FileTextIcon,
  HashIcon,
  PencilSimpleIcon,
  UserIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { RequestRowViewModel } from '../lib/rowViewModel';
import { REQUEST_REJECTED } from '../lib/optionSets';
import { cx } from '../lib/classNames';
import { formatAmount, formatDateTime } from '../lib/format';

interface ReviewModalProps {
  row: RequestRowViewModel;
  onCancel: () => void;
  onReject: (comment: string) => Promise<void>;
  onLeaveApproved: () => Promise<void>;
}

/** Icons used throughout the dialog. */
const ICONS = {
  hash: HashIcon,
  document: FileTextIcon,
  close: XIcon,
  user: UserIcon,
  currency: CurrencyCircleDollarIcon,
  warning: WarningIcon,
  pencil: PencilSimpleIcon,
  checkCircle: CheckCircleIcon,
  clock: ClockIcon,
} as const;

type PillTone = 'neutral' | 'success' | 'danger' | 'pending';

/** Evaluation flags a reviewer should see before deciding, in display order. */
const EXCEPTION_MESSAGES: [flag: keyof RequestRowViewModel['evaluation'], message: string][] = [
  ['unmatchedEmployee', 'Authorizer name has no system user match. Defaulted to the PA position and its limit.'],
  ['ambiguousEmployee', 'Authorizer name matched more than one system user.'],
  ['unmatchedService', 'Service could not be matched to a service category.'],
  ['unmatchedAgent', 'Entering agent has no system user match.'],
  ['ambiguousAgent', 'Entering agent matched more than one system user.'],
];

export function ReviewModal({ row, onCancel, onReject, onLeaveApproved }: ReviewModalProps) {
  const [comment, setComment] = useState('');
  const [rejectAttempted, setRejectAttempted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /** Runs a decision callback with the busy flag held, surfacing any failure inline. */
  async function runDecision(action: () => Promise<void>, fallbackError: string) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : fallbackError);
    } finally {
      setBusy(false);
    }
  }

  function handleReject() {
    if (!comment.trim()) {
      setRejectAttempted(true);
      setError('Justification is required to reject this request.');
      return;
    }
    void runDecision(() => onReject(comment), 'Failed to reject request.');
  }

  function handleLeaveApproved() {
    void runDecision(onLeaveApproved, 'Failed to save decision.');
  }

  const locked = row.decisionLocked;
  // Anyone else who can see an open request (e.g. a Discount App Admin) gets it read-only.
  const readOnly = locked || !row.canDecide;
  const rejected = row.requestStatus === REQUEST_REJECTED;
  const decisionLabel = rejected ? 'Rejected' : 'Left Approved';
  const authorityTone: PillTone = row.isOutOfAuthority ? 'danger' : 'success';
  const limitAmount = row.authorizedLimit != null ? (row.billTotal * row.authorizedLimit) / 100 : undefined;
  const netPayable = row.billTotal - row.totalDiscountAmount;
  const exceptions = EXCEPTION_MESSAGES.filter(([flag]) => row.evaluation[flag]).map(([, message]) => message);
  const serviceLabel = [row.serviceCategory, row.serviceName].filter(Boolean).join(' / ') || '-';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="rm-header">
          <div className="rm-header-main">
            <div className="rm-pills">
              <Pill tone="neutral">
                <Icon name="hash" />
                {row.request.dis_name}
              </Pill>
              {locked ? (
                <Pill tone={rejected ? 'danger' : 'success'}>{decisionLabel}</Pill>
              ) : (
                <Pill tone="pending">Awaiting Review</Pill>
              )}
              <Pill tone={authorityTone}>{row.isOutOfAuthority ? 'Out of Authority' : 'Within Authority'}</Pill>
            </div>
            <div className="rm-title-row">
              <div className="rm-title-icon">
                <Icon name="document" />
              </div>
              <div>
                <h2 id="review-modal-title" className="rm-title">
                  {locked ? 'Decision Details' : 'Review Decision'}
                </h2>
                <p className="rm-subtitle">Discount authority review &amp; decision log</p>
              </div>
            </div>
          </div>
          <button type="button" className="rm-close" aria-label="Close dialog" onClick={onCancel}>
            <Icon name="close" />
          </button>
        </header>

        <div className="rm-body">
          {/* Patient & encounter */}
          <section className="rm-card">
            <div className="rm-card-head">
              <Icon name="user" />
              Patient &amp; Encounter
            </div>
            <div className="rm-patient">
              <div className="rm-patient-id">
                <div className="rm-avatar">{initials(row.patientName)}</div>
                <div>
                  <div className="rm-patient-name">{row.patientName || '-'}</div>
                  <div className="rm-mono rm-muted">
                    Patient ID: <strong>{row.patientId || '-'}</strong>
                  </div>
                </div>
              </div>
              <div className="rm-patient-meta">
                <Meta label="Visit ID" value={<span className="rm-mono">{row.visitId || '-'}</span>} />
                <Meta label="Service Level" value={row.serviceLevel || '-'} />
                <Meta label="Time Block" value={<span className="rm-chip">{row.timeBlock || '-'}</span>} />
              </div>
            </div>
            <div className="rm-service-strip">
              <span className="rm-muted">Service:</span> <strong>{serviceLabel}</strong>
            </div>
          </section>

          {/* Financial */}
          <section className="rm-card">
            <div className="rm-card-head rm-card-head-split">
              <span className="rm-card-head-label">
                <Icon name="currency" />
                Financials &amp; Authority Limit
              </span>
              <Pill tone={authorityTone}>
                {row.isOutOfAuthority ? 'Exceeds Authority Limit' : 'Within Authority Limit'}
              </Pill>
            </div>
            <div className="rm-stats">
              <div className="rm-stat">
                <div className="rm-stat-label">Bill Total</div>
                <div className="rm-stat-value">{formatAmount(row.billTotal)}</div>
              </div>
              <div className="rm-stat rm-stat-accent">
                <div className="rm-stat-label rm-stat-label-split">
                  Discount Requested
                  <span className="rm-stat-tag">{row.totalDiscountPercent}%</span>
                </div>
                <div className="rm-stat-value">{formatAmount(row.totalDiscountAmount)}</div>
                <div className="rm-stat-note">Net payable: {formatAmount(netPayable)}</div>
              </div>
              <div className={cx('rm-stat', !!row.overageAboveAuthority && 'rm-stat-danger')}>
                <div className="rm-stat-label">Authorized Limit</div>
                <div className="rm-stat-value">
                  {limitAmount != null ? `${row.authorizedLimit}%` : '-'}
                  {limitAmount != null && <span className="rm-stat-unit">({formatAmount(limitAmount)} max)</span>}
                </div>
                <div className="rm-stat-note">
                  Overage: <strong>{row.overageAboveAuthority ? formatAmount(row.overageAboveAuthority) : 'None'}</strong>
                </div>
              </div>
            </div>
            <AuthorityGauge requested={row.totalDiscountPercent} limit={row.authorizedLimit} over={row.isOutOfAuthority} />
          </section>

          {/* Governance */}
          <section className="rm-section">
            <h3 className="rm-section-title">Audit Trail &amp; Governance</h3>

            {exceptions.length > 0 && (
              <div className="rm-exception">
                <div className="rm-exception-icon">
                  <Icon name="warning" />
                </div>
                <div>
                  <div className="rm-exception-title">System Exception Flag</div>
                  <ul className="rm-exception-list">
                    {exceptions.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="rm-trail">
              <div className="rm-trail-card">
                <div className="rm-trail-head">
                  <Icon name="pencil" />
                  Origin &amp; Submission
                </div>
                <Meta label="Authorized By" value={<strong>{row.authorizedByDisplay || '-'}</strong>} />
                <Meta label="Entered By" value={row.agentName || '-'} />
                <Meta label="Created On" value={<span className="rm-mono">{formatDateTime(row.actualCreatedOn)}</span>} />
              </div>

              {locked ? (
                <div className={cx('rm-trail-card', rejected ? 'rm-trail-card-danger' : 'rm-trail-card-success')}>
                  <div className="rm-trail-head">
                    <Icon name="checkCircle" />
                    Final Determination
                  </div>
                  <Meta label="Decision" value={<strong>{decisionLabel}</strong>} />
                  <Meta label="Decided By" value={<strong>{row.decidedByName || '-'}</strong>} />
                  <Meta label="Decision Date" value={<span className="rm-mono">{formatDateTime(row.decisionDate)}</span>} />
                </div>
              ) : (
                <div className="rm-trail-card rm-trail-card-pending">
                  <div className="rm-trail-head">
                    <Icon name="clock" />
                    Pending Determination
                  </div>
                  <p className="rm-muted rm-small">
                    This request was auto-approved at entry. Leave it approved, or reject it with a justification.
                  </p>
                </div>
              )}
            </div>

            <div className="rm-remarks">
              <Remark label="Reason" text={row.reason} />
              <Remark label="Note" text={row.note} />
              {locked && <Remark label="Decision Comment" text={row.decisionComment} />}
            </div>

            {!readOnly && (
              <div className="rm-justification">
                <label className="modal-label" htmlFor="rm-justification">
                  Justification
                </label>
                <textarea
                  id="rm-justification"
                  className={cx('modal-textarea', rejectAttempted && !!error && 'modal-textarea-invalid')}
                  placeholder="Required only if you reject this request"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={busy}
                />
                {error && <div className="modal-error">{error}</div>}
              </div>
            )}
          </section>
        </div>

        <footer className="rm-footer">
          <div className="rm-footer-status">
            <span className={cx('rm-dot', !locked && 'rm-dot-pending')} />
            {locked
              ? 'Decision locked'
              : readOnly
                ? 'View only. Awaiting the Authorized By’s decision'
                : 'Awaiting your decision'}
          </div>
          <div className="modal-actions">
            {readOnly ? (
              <button type="button" className="modal-btn modal-btn-dark" onClick={onCancel}>
                Close
              </button>
            ) : (
              <>
                <button type="button" className="modal-btn modal-btn-neutral" onClick={onCancel} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="modal-btn modal-btn-reject" onClick={handleReject} disabled={busy}>
                  <XIcon weight="bold" aria-hidden="true" />
                  Reject
                </button>
                <button type="button" className="modal-btn modal-btn-approve" onClick={handleLeaveApproved} disabled={busy}>
                  <CheckIcon weight="bold" aria-hidden="true" />
                  Leave Approved
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function AuthorityGauge({ requested, limit, over }: { requested: number; limit?: number; over: boolean }) {
  if (limit == null) {
    return (
      <div className="rm-gauge">
        <div className="rm-gauge-row">
          <span>Authority Consumption</span>
          <span className="rm-muted">No matching matrix rule, so no authority limit applies</span>
        </div>
      </div>
    );
  }
  // Scale so both the request and the cap fit on the bar.
  const scale = Math.max(requested, limit, 0.0001);
  const usedPct = (Math.min(requested, limit) / scale) * 100;
  const overPct = over ? (Math.max(requested - limit, 0) / scale) * 100 : 0;
  const capPct = (limit / scale) * 100;
  return (
    <div className="rm-gauge">
      <div className="rm-gauge-row">
        <span>Authority Consumption</span>
        <span className="rm-mono">
          <strong>{requested}%</strong> requested / <strong>{limit}%</strong> limit
        </span>
      </div>
      <div className="rm-gauge-track">
        <div className="rm-gauge-used" style={{ width: `${usedPct}%` }} />
        {overPct > 0 && <div className="rm-gauge-over" style={{ width: `${overPct}%` }} />}
        <div className="rm-gauge-cap" style={{ left: `${capPct}%` }} />
      </div>
      <div className="rm-gauge-scale">
        <span>0%</span>
        <span
          className="rm-gauge-cap-label"
          style={{ left: `${capPct}%`, transform: `translateX(${capPct > 85 ? '-100%' : '-50%'})` }}
        >
          Cap: {limit}%
        </span>
      </div>
    </div>
  );
}

function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return <span className={`rm-pill rm-pill-${tone}`}>{children}</span>;
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rm-meta">
      <div className="rm-meta-label">{label}</div>
      <div className="rm-meta-value">{value}</div>
    </div>
  );
}

function Remark({ label, text }: { label: string; text: string }) {
  return (
    <div className="rm-remark">
      <div className="rm-meta-label">{label}</div>
      {text ? <p className="rm-remark-text">{text}</p> : <p className="rm-remark-empty">None provided.</p>}
    </div>
  );
}

function Icon({ name }: { name: keyof typeof ICONS }) {
  const Glyph = ICONS[name];
  return <Glyph className="rm-icon" aria-hidden="true" />;
}

/** First and last initials of a name ("Ahmed Ali Hassan" → "AH"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
