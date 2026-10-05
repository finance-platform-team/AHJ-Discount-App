import type {
  Dis_discountrequestsdis_servicecategory,
  Dis_discountrequestsdis_servicelevel,
} from '../generated/models/Dis_discountrequestsModel';
import { REQUEST_APPROVED, REQUEST_REJECTED } from './optionSets';
import type { RequestRowViewModel } from './rowViewModel';

export type StatusFilter = 'all' | 'outOfAuthority' | 'withinAuthority' | 'approved' | 'rejected';
export type ServiceLevelFilter = Dis_discountrequestsdis_servicelevel | 'all';
export type ServiceCategoryFilter = Dis_discountrequestsdis_servicecategory | 'all';

export interface RequestFilters {
  status: StatusFilter;
  serviceLevel: ServiceLevelFilter;
  serviceCategory: ServiceCategoryFilter;
  keyword: string;
}

export const DEFAULT_REQUEST_FILTERS: RequestFilters = {
  status: 'all',
  serviceLevel: 'all',
  serviceCategory: 'all',
  keyword: '',
};

/** Single definition of each status tab, shared by the tab counts and the row filter so they never disagree. */
const STATUS_PREDICATES: Record<StatusFilter, (row: RequestRowViewModel) => boolean> = {
  all: () => true,
  outOfAuthority: (r) => r.isOutOfAuthority,
  withinAuthority: (r) => !r.isOutOfAuthority,
  approved: (r) => r.requestStatus === REQUEST_APPROVED,
  rejected: (r) => r.requestStatus === REQUEST_REJECTED,
};

const STATUS_FILTERS = Object.keys(STATUS_PREDICATES) as StatusFilter[];

export interface RequestCounts extends Record<StatusFilter, number> {
  outOfYourAuthority: number;
}

/** Counts every status tab plus the viewer's own out-of-authority rows in a single pass. */
export function countRequests(rows: RequestRowViewModel[]): RequestCounts {
  const counts: RequestCounts = {
    all: 0,
    outOfAuthority: 0,
    withinAuthority: 0,
    approved: 0,
    rejected: 0,
    outOfYourAuthority: 0,
  };
  for (const row of rows) {
    for (const key of STATUS_FILTERS) {
      if (STATUS_PREDICATES[key](row)) counts[key]++;
    }
    if (row.isOutOfYourAuthority) counts.outOfYourAuthority++;
  }
  return counts;
}

function searchText(row: RequestRowViewModel): string {
  return [row.patientName, row.patientId, row.visitId, row.serviceName, row.authorizedByDisplay, row.agentName]
    .join(' ')
    .toLowerCase();
}

export function filterRequests(rows: RequestRowViewModel[], filters: RequestFilters): RequestRowViewModel[] {
  const matchesStatus = STATUS_PREDICATES[filters.status];
  const keyword = filters.keyword.trim().toLowerCase();
  const { serviceLevel, serviceCategory } = filters;

  return rows.filter(
    (r) =>
      matchesStatus(r) &&
      (serviceLevel === 'all' || r.request.dis_servicelevel === serviceLevel) &&
      (serviceCategory === 'all' || r.evaluation.serviceCategory === serviceCategory) &&
      (!keyword || searchText(r).includes(keyword))
  );
}
