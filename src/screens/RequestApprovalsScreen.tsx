import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar } from '../components/TopBar';
import { KpiCards } from '../components/KpiCards';
import { FilterTabs, type FilterKey } from '../components/FilterTabs';
import { RequestsGrid } from '../components/RequestsGrid';
import { ReviewModal } from '../components/ReviewModal';
import { fetchSystemUsers, fetchMatrixRows, fetchRequests, evaluateAndSyncRequests } from '../lib/dataSync';
import { buildRowViewModel, type RequestRowViewModel } from '../lib/rowViewModel';
import { useCurrentUser } from '../lib/currentUser';
import { leaveApproved, reject } from '../lib/decisionService';
import { REQUEST_APPROVED, REQUEST_REJECTED } from '../lib/optionSets';
import { seedDiscountRequests, type RequestSeedProgress } from '../lib/seedRequestData';
import type { SystemUserLite } from '../lib/types';

interface RequestApprovalsScreenProps {
  onOutOfAuthorityCountChange: (count: number) => void;
}

export function RequestApprovalsScreen({ onOutOfAuthorityCountChange }: RequestApprovalsScreenProps) {
  const { user: currentUser } = useCurrentUser();
  const [rows, setRows] = useState<RequestRowViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [keyword, setKeyword] = useState('');
  const [selectedRow, setSelectedRow] = useState<RequestRowViewModel | null>(null);
  const [loadError, setLoadError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState<RequestSeedProgress | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError('');
      const [systemUsers, matrixRows, requests] = await Promise.all([
        fetchSystemUsers(),
        fetchMatrixRows(),
        fetchRequests(),
      ]);
      const systemUsersById = new Map<string, SystemUserLite>(systemUsers.map((u) => [u.systemuserid, u]));
      const evaluated = await evaluateAndSyncRequests(requests, systemUsers, matrixRows);
      const viewModels = evaluated.map(({ request, evaluation }) =>
        buildRowViewModel(request, evaluation, systemUsersById, currentUser?.systemUserId ?? null)
      );
      setRows(viewModels);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.systemUserId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
  }

  async function handleSeed() {
    setSeeding(true);
    setSeedProgress(null);
    try {
      const result = await seedDiscountRequests(setSeedProgress);
      setSeedProgress(result);
      await load();
    } finally {
      setSeeding(false);
    }
  }

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, outOfAuthority: 0, withinAuthority: 0, approved: 0, rejected: 0 };
    for (const row of rows) {
      c.all++;
      if (row.isOutOfAuthority) c.outOfAuthority++;
      else c.withinAuthority++;
      if (row.requestStatus === REQUEST_APPROVED) c.approved++;
      if (row.requestStatus === REQUEST_REJECTED) c.rejected++;
    }
    return c;
  }, [rows]);

  const outOfYourAuthorityCount = useMemo(() => rows.filter((r) => r.isOutOfYourAuthority).length, [rows]);

  useEffect(() => {
    onOutOfAuthorityCountChange(counts.outOfAuthority);
  }, [counts.outOfAuthority, onOutOfAuthorityCountChange]);

  const filteredRows = useMemo(() => {
    let result = rows;
    switch (activeFilter) {
      case 'outOfAuthority':
        result = result.filter((r) => r.isOutOfAuthority);
        break;
      case 'withinAuthority':
        result = result.filter((r) => !r.isOutOfAuthority);
        break;
      case 'approved':
        result = result.filter((r) => r.requestStatus === REQUEST_APPROVED);
        break;
      case 'rejected':
        result = result.filter((r) => r.requestStatus === REQUEST_REJECTED);
        break;
    }
    const kw = keyword.trim().toLowerCase();
    if (kw) {
      result = result.filter((r) =>
        [r.patientName, r.patientId, r.visitId, r.serviceName, r.authorizedByDisplay, r.agentName]
          .join(' ')
          .toLowerCase()
          .includes(kw)
      );
    }
    return result;
  }, [rows, activeFilter, keyword]);

  async function handleLeaveApproved() {
    if (!selectedRow || !currentUser) return;
    await leaveApproved(selectedRow.id, currentUser.systemUserId);
    setSelectedRow(null);
    await load();
  }

  async function handleReject(comment: string) {
    if (!selectedRow || !currentUser) return;
    await reject(selectedRow.id, currentUser.systemUserId, comment);
    setSelectedRow(null);
    await load();
  }

  return (
    <div className="screen">
      <TopBar showCommandBar onRefresh={handleRefresh} refreshing={refreshing} />
      <div className="screen-body">
        <div className="page-header">
          <h1>Discounts Authorization</h1>
          <p>Discount requests entered in DotCare, classified against the AHJ Discount Policy (Sec. 6.1).</p>
        </div>

        <div className="info-card">
          <button type="button" onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Seeding…' : 'Seed Sample Requests (Dev)'}
          </button>
          {seedProgress && (
            <p>
              Seeded {seedProgress.done}/{seedProgress.total}
              {seedProgress.failed.length > 0 && ` — ${seedProgress.failed.length} failed: ${seedProgress.failed.map((f) => f.name).join(', ')}`}
            </p>
          )}
        </div>

        {loadError && <div className="load-error">{loadError}</div>}

        <KpiCards
          total={counts.all}
          outOfYourAuthority={outOfYourAuthorityCount}
          approved={counts.approved}
          rejected={counts.rejected}
        />

        <FilterTabs active={activeFilter} onChange={setActiveFilter} counts={counts} keyword={keyword} onKeywordChange={setKeyword} />

        {loading ? (
          <div className="loading">Loading requests…</div>
        ) : (
          <RequestsGrid rows={filteredRows} onReview={setSelectedRow} />
        )}
      </div>

      {selectedRow && (
        <ReviewModal
          row={selectedRow}
          onCancel={() => setSelectedRow(null)}
          onReject={handleReject}
          onLeaveApproved={handleLeaveApproved}
        />
      )}
    </div>
  );
}
