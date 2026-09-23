import { useCallback, useEffect, useMemo, useState } from 'react';
import { KpiCards } from '../components/KpiCards';
import { FilterTabs, type FilterKey } from '../components/FilterTabs';
import type {
  Dis_discountrequestsdis_servicecategory,
  Dis_discountrequestsdis_servicelevel,
} from '../generated/models/Dis_discountrequestsModel';
import { RequestsGrid } from '../components/RequestsGrid';
import { ReviewModal } from '../components/ReviewModal';
import { fetchSystemUsers, fetchMatrixRows, fetchRequests, evaluateAndSyncRequests } from '../lib/dataSync';
import { buildRowViewModel, type RequestRowViewModel } from '../lib/rowViewModel';
import { useCurrentUser, DISCOUNT_BASIC_USER_ROLE } from '../lib/currentUser';
import { leaveApproved, reject } from '../lib/decisionService';
import { REQUEST_APPROVED, REQUEST_REJECTED } from '../lib/optionSets';
import type { SystemUserLite } from '../lib/types';

interface RequestApprovalsScreenProps {
  onOutOfAuthorityCountChange: (count: number) => void;
}

export function RequestApprovalsScreen({ onOutOfAuthorityCountChange }: RequestApprovalsScreenProps) {
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  const [rows, setRows] = useState<RequestRowViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [keyword, setKeyword] = useState('');
  const [serviceLevelFilter, setServiceLevelFilter] = useState<Dis_discountrequestsdis_servicelevel | 'all'>('all');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<Dis_discountrequestsdis_servicecategory | 'all'>(
    'all'
  );
  const [selectedRow, setSelectedRow] = useState<RequestRowViewModel | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    // Wait for the signed-in user's security role check to finish before fetching/showing
    // any data — otherwise a Discount Basic User would briefly see every record unfiltered.
    if (userLoading) return;
    try {
      setLoadError('');
      const [systemUsers, matrixRows, requests] = await Promise.all([
        fetchSystemUsers(),
        fetchMatrixRows(),
        fetchRequests(),
      ]);
      const systemUsersById = new Map<string, SystemUserLite>(systemUsers.map((u) => [u.systemuserid, u]));
      const evaluated = await evaluateAndSyncRequests(requests, systemUsers, matrixRows);
      let viewModels = evaluated.map(({ request, evaluation }) =>
        buildRowViewModel(request, evaluation, systemUsersById, currentUser?.systemUserId ?? null)
      );
      // Discount Basic User is restricted to only the records where they are the Authorized By.
      if (currentUser?.roleNames.includes(DISCOUNT_BASIC_USER_ROLE)) {
        viewModels = viewModels.filter((r) => r.evaluation.authorizedBySystemUserId === currentUser.systemUserId);
      }
      setRows(viewModels);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, userLoading]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function handleRefresh() {
    window.location.reload();
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
    if (serviceLevelFilter !== 'all') {
      result = result.filter((r) => r.request.dis_servicelevel === serviceLevelFilter);
    }
    if (serviceCategoryFilter !== 'all') {
      result = result.filter((r) => r.request.dis_servicecategory?.includes(serviceCategoryFilter));
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
  }, [rows, activeFilter, keyword, serviceLevelFilter, serviceCategoryFilter]);

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
      <div className="screen-body">
        <div className="page-header">
          <p>Discount requests entered in DotCare, classified against the AHJ Discount Policy (Sec. 6.1).</p>
        </div>

        {loadError && <div className="load-error">{loadError}</div>}

        <KpiCards
          total={counts.all}
          outOfYourAuthority={outOfYourAuthorityCount}
          approved={counts.approved}
          rejected={counts.rejected}
        />

        <FilterTabs
          active={activeFilter}
          onChange={setActiveFilter}
          counts={counts}
          keyword={keyword}
          onKeywordChange={setKeyword}
          serviceLevel={serviceLevelFilter}
          onServiceLevelChange={setServiceLevelFilter}
          serviceCategory={serviceCategoryFilter}
          onServiceCategoryChange={setServiceCategoryFilter}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

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
