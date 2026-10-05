import { REQUEST_APPROVED, REQUEST_REJECTED } from './optionSets';
import type { RequestRowViewModel } from './rowViewModel';

export type DecisionTab = 'all' | 'approved' | 'rejected' | 'violations';

/** Single definition of each tab, shared by the tab counts, KPI cards and the row filter. */
const TAB_PREDICATES: Record<DecisionTab, (row: RequestRowViewModel) => boolean> = {
  all: () => true,
  approved: (r) => r.requestStatus === REQUEST_APPROVED,
  rejected: (r) => r.requestStatus === REQUEST_REJECTED,
  // The discount went above the Authorized By's limit for this service/time block.
  violations: (r) => r.isOutOfAuthority,
};

const TABS = Object.keys(TAB_PREDICATES) as DecisionTab[];

/** OData $filter for the requests this log shows: only decided (locked) ones. */
export const DECIDED_REQUESTS_FILTER = 'dis_decisionlocked eq true';

/** Decided (locked) requests, newest decision first. Who may see which is the access scope's job. */
export function decidedRequests(rows: RequestRowViewModel[]): RequestRowViewModel[] {
  return rows.filter((r) => r.decisionLocked).sort((a, b) => b.decisionDate.localeCompare(a.decisionDate));
}

export function countDecisions(rows: RequestRowViewModel[]): Record<DecisionTab, number> {
  const counts = { all: 0, approved: 0, rejected: 0, violations: 0 };
  for (const row of rows) {
    for (const tab of TABS) {
      if (TAB_PREDICATES[tab](row)) counts[tab]++;
    }
  }
  return counts;
}

/** Percentage points the discount went above the authorized limit (0 when within it). */
export function overagePercent(row: RequestRowViewModel): number {
  return Math.max(0, row.totalDiscountPercent - (row.authorizedLimit ?? 0));
}

export function serviceSummary(row: RequestRowViewModel): string {
  return [row.serviceLevel, row.serviceCategory || row.serviceName].filter(Boolean).join(' · ');
}

function searchText(row: RequestRowViewModel): string {
  return [
    row.request.dis_name,
    row.patientName,
    row.patientId,
    row.visitId,
    row.serviceName,
    row.serviceCategory,
    row.decidedByName,
    row.decisionComment,
  ]
    .join(' ')
    .toLowerCase();
}

export function filterDecisions(rows: RequestRowViewModel[], tab: DecisionTab, keyword: string): RequestRowViewModel[] {
  const matchesTab = TAB_PREDICATES[tab];
  const needle = keyword.trim().toLowerCase();
  return rows.filter((r) => matchesTab(r) && (!needle || searchText(r).includes(needle)));
}
