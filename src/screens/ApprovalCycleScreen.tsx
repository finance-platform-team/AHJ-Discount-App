import { useEffect, useMemo, useState } from 'react';
import { cx } from '../lib/classNames';
import { DecisionLogGrid } from '../components/DecisionLogGrid';
import { loadRequestRows } from '../lib/requestRows';
import type { RequestRowViewModel } from '../lib/rowViewModel';
import type { CurrentUser } from '../lib/currentUser';
import { requestScopeFor } from '../lib/accessScope';
import { buildMockRows, isMockMode } from '../lib/devMockRows';
import {
  countDecisions,
  DECIDED_REQUESTS_FILTER,
  decidedRequests,
  filterDecisions,
  type DecisionTab,
} from '../lib/decisionLog';

const TABS: { key: DecisionTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'violations', label: 'Violations' },
];

interface ApprovalCycleScreenProps {
  currentUser: CurrentUser | null;
  userLoading: boolean;
  onDecisionCountChange: (count: number) => void;
}

/** Decisions on the requests the signed-in user entered (the Entered By / Agent), so they can see the outcome. */
export function ApprovalCycleScreen({ currentUser, userLoading, onDecisionCountChange }: ApprovalCycleScreenProps) {
  const [rows, setRows] = useState<RequestRowViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<DecisionTab>('all');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (isMockMode()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(decidedRequests(buildMockRows()));
      setLoading(false);
      return;
    }
    if (userLoading) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadError('');
        // Each Entered By (Agent) only sees (and only downloads) the decisions on requests they
        // entered. Read-only view: they may not be allowed to write to the request.
        const decided = await loadRequestRows(currentUser, requestScopeFor('enteredBy', currentUser), {
          persist: false,
          filter: DECIDED_REQUESTS_FILTER,
        });
        if (!cancelled) setRows(decidedRequests(decided));
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load decisions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, userLoading]);

  const counts = useMemo(() => countDecisions(rows), [rows]);
  const visibleRows = useMemo(() => filterDecisions(rows, tab, keyword), [rows, tab, keyword]);

  useEffect(() => {
    onDecisionCountChange(counts.all);
  }, [counts.all, onDecisionCountChange]);

  const cards = [
    { label: 'Total Decisions', value: counts.all, caption: 'on requests you entered', tone: '' },
    { label: 'Approved', value: counts.approved, caption: 'confirmed by authority', tone: 'kpi-card-success' },
    { label: 'Rejected', value: counts.rejected, caption: 'sent back with a comment', tone: 'kpi-card-error' },
    { label: 'Violations Flagged', value: counts.violations, caption: 'above Authorized By limit', tone: 'kpi-card-warning' },
  ];

  return (
    <div className="screen">
      <div className="screen-body">
        <div className="page-header">
          <p>Every accept/reject decision on the requests you entered, with violation flags and comments.</p>
        </div>

        {loadError && <div className="load-error">{loadError}</div>}
        {!loading && !currentUser && !isMockMode() && (
          <div className="load-error">Your account could not be matched to a Dataverse user.</div>
        )}

        <div className="kpi-row">
          {cards.map((card) => (
            <div className={cx('kpi-card', card.tone)} key={card.label}>
              <div className="kpi-label">{card.label}</div>
              <div className="kpi-value">{card.value}</div>
              <div className="kpi-caption">{card.caption}</div>
            </div>
          ))}
        </div>

        <div className="filter-tabs" role="tablist" aria-label="Filter decisions">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={cx(
                'filter-tab',
                tab === t.key && 'active',
                t.key === 'violations' && counts.violations > 0 && 'filter-tab-alert'
              )}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="filter-count">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        <div className="table-card">
          <div className="grid-toolbar">
            <div className="filter-search-wrap">
              <svg className="filter-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                className="filter-search"
                placeholder="Filter by keyword"
                aria-label="Filter by keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="grid-toolbar-end">
              <span className="grid-result-count">
                Showing <strong>{visibleRows.length}</strong> of {rows.length}
              </span>
            </div>
          </div>
          <DecisionLogGrid rows={visibleRows} loading={loading} />
        </div>
      </div>
    </div>
  );
}
