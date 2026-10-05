import { useCallback, useEffect, useMemo, useState } from 'react';
import { KpiCards } from '../components/KpiCards';
import { FilterTabs, FilterToolbar } from '../components/FilterTabs';
import { RequestsGrid } from '../components/RequestsGrid';
import { ReviewModal } from '../components/ReviewModal';
import { loadRequestRows } from '../lib/requestRows';
import type { RequestRowViewModel } from '../lib/rowViewModel';
import type { CurrentUser } from '../lib/currentUser';
import { hasFullAccess, requestScopeFor } from '../lib/accessScope';
import { leaveApproved, reject } from '../lib/decisionService';
import { countRequests, DEFAULT_REQUEST_FILTERS, filterRequests, type RequestFilters } from '../lib/requestFilters';
import { buildMockRows, isMockMode } from '../lib/devMockRows';
import { deleteAllDiscountRequests, seedDiscountRequests } from '../lib/seedRequestData';
import { DevDataActions, type DevDataAction } from '../components/DevDataActions';

/** Seed needs the signed-in user for its "Out of Your Authority" cases, so the list is built per user. */
const requestDevActions = (currentUser: CurrentUser | null): DevDataAction[] => [
  {
    label: 'Seed Requests (Dev)',
    busyLabel: 'Seeding…',
    doneLabel: 'Seeded',
    run: (onProgress) => seedDiscountRequests(onProgress, currentUser),
  },
  {
    label: 'Delete All (Dev)',
    busyLabel: 'Deleting…',
    doneLabel: 'Deleted',
    confirm:
      'Permanently delete ALL discount requests from Dataverse — including decided and locked ones?\n\n' +
      'This cannot be undone.',
    run: deleteAllDiscountRequests,
  },
];

interface RequestApprovalsScreenProps {
  currentUser: CurrentUser | null;
  userLoading: boolean;
  onOutOfAuthorityCountChange: (count: number) => void;
}

export function RequestApprovalsScreen({
  currentUser,
  userLoading,
  onOutOfAuthorityCountChange,
}: RequestApprovalsScreenProps) {
  const [rows, setRows] = useState<RequestRowViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_REQUEST_FILTERS);
  // Seeding/deleting touches every request, so it is only offered to full-access users.
  const devActions = useMemo(
    () => (hasFullAccess(currentUser) ? requestDevActions(currentUser) : []),
    [currentUser]
  );
  const [selectedRow, setSelectedRow] = useState<RequestRowViewModel | null>(null);

  const load = useCallback(async () => {
    if (isMockMode()) {
      setRows(buildMockRows());
      setLoading(false);
      return;
    }
    // Wait for the signed-in user's security role check to finish before fetching/showing
    // any data — otherwise a restricted user would briefly see records that aren't theirs.
    if (userLoading) return;
    try {
      setLoadError('');
      // Each Authorized By only sees (and only downloads) the requests they authorized.
      setRows(await loadRequestRows(currentUser, requestScopeFor('authorizedBy', currentUser)));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, userLoading]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const counts = useMemo(() => countRequests(rows), [rows]);
  const filteredRows = useMemo(() => filterRequests(rows, filters), [rows, filters]);

  useEffect(() => {
    onOutOfAuthorityCountChange(counts.outOfAuthority);
  }, [counts.outOfAuthority, onOutOfAuthorityCountChange]);

  const updateFilter = <K extends keyof RequestFilters>(key: K) => (value: RequestFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  /** Records a decision on the open request, then closes the dialog and reloads the grid. */
  async function decide(record: (requestId: string, decidedBySystemUserId: string) => Promise<void>) {
    if (!selectedRow || !currentUser) return;
    await record(selectedRow.id, currentUser.systemUserId);
    setSelectedRow(null);
    await load();
  }

  return (
    <div className="screen">
      <div className="screen-body">
        <div className="page-header">
          <p>Discount requests entered in DotCare, classified against the AHJ Discount Policy.</p>
          <DevDataActions actions={devActions} onDone={load} />
        </div>

        {loadError && <div className="load-error">{loadError}</div>}
        {!loading && !currentUser && !isMockMode() && (
          <div className="load-error">Your account could not be matched to a Dataverse user.</div>
        )}

        <KpiCards
          total={counts.all}
          outOfYourAuthority={counts.outOfYourAuthority}
          approved={counts.approved}
          rejected={counts.rejected}
        />

        <FilterTabs active={filters.status} onChange={updateFilter('status')} counts={counts} />

        <div className="table-card">
          <FilterToolbar
            keyword={filters.keyword}
            onKeywordChange={updateFilter('keyword')}
            serviceLevel={filters.serviceLevel}
            onServiceLevelChange={updateFilter('serviceLevel')}
            serviceCategory={filters.serviceCategory}
            onServiceCategoryChange={updateFilter('serviceCategory')}
            shownCount={filteredRows.length}
            totalCount={rows.length}
            onRefresh={() => window.location.reload()}
          />
          <RequestsGrid rows={filteredRows} loading={loading} onReview={setSelectedRow} />
        </div>
      </div>

      {selectedRow && (
        <ReviewModal
          row={selectedRow}
          onCancel={() => setSelectedRow(null)}
          onReject={(comment) => decide((id, userId) => reject(id, userId, comment))}
          onLeaveApproved={() => decide(leaveApproved)}
        />
      )}
    </div>
  );
}
