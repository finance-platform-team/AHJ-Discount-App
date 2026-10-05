import { Dis_discountlimitmatrixesService } from '../generated/services/Dis_discountlimitmatrixesService';
import { Dis_discountrequestsService } from '../generated/services/Dis_discountrequestsService';
import { SystemusersService } from '../generated/services/SystemusersService';
import type {
  Dis_discountrequests,
  Dis_discountrequestsBase,
  Dis_discountrequestsdis_servicecategory,
} from '../generated/models/Dis_discountrequestsModel';
import { evaluateRequest } from './evaluateRequest';
import type { EvaluatedRequestFields, MatrixRowLite, SystemUserLite } from './types';
import type { IGetAllOptions } from '../generated/models/CommonModels';

const MAX_PAGE_SIZE = 5000;

/** Caps concurrent Dataverse update calls so a large batch doesn't slam the API all at once. */
const UPDATE_CONCURRENCY = 8;

/** Follows `skipToken` paging until every record has been read. */
async function fetchAll<T>(
  getAll: (options: IGetAllOptions) => Promise<{ data?: T[]; skipToken?: string }>,
  baseOptions: IGetAllOptions
): Promise<T[]> {
  const all: T[] = [];
  let skipToken: string | undefined;
  do {
    const result = await getAll({ maxPageSize: MAX_PAGE_SIZE, ...baseOptions, skipToken });
    all.push(...(result.data ?? []));
    skipToken = result.skipToken;
  } while (skipToken);
  return all;
}

export async function fetchSystemUsers(): Promise<SystemUserLite[]> {
  const records = await fetchAll((options) => SystemusersService.getAll(options), {
    select: ['systemuserid', 'fullname', 'title'],
  });
  return records.map(({ systemuserid, fullname, title }) => ({ systemuserid, fullname, title }));
}

export async function fetchMatrixRows(): Promise<MatrixRowLite[]> {
  const records = await fetchAll((options) => Dis_discountlimitmatrixesService.getAll(options), {
    select: [
      'dis_discountlimitmatrixid',
      'dis_servicelevel',
      'dis_timeblock',
      'dis_servicecategory',
      'dis_position',
      'dis_authorizedlimitpercent',
      'dis_hasauthority',
      'dis_isunlimited',
      'statuscode',
    ],
  });
  return records as unknown as MatrixRowLite[];
}

/** Every request, or only those matching an OData $filter (e.g. the viewer's access scope). */
export function fetchRequests(filter?: string): Promise<Dis_discountrequests[]> {
  return fetchAll((options) => Dis_discountrequestsService.getAll(options), { orderBy: ['createdon desc'], filter });
}

export interface EvaluatedRequest {
  request: Dis_discountrequests;
  evaluation: EvaluatedRequestFields;
}

async function runWithConcurrency(tasks: (() => Promise<unknown>)[], limit: number): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      await tasks[next++]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

/** True when the evaluated (DotCare-mapped) category should be written back to dis_servicecategory. */
function isServiceCategoryStale(request: Dis_discountrequests, evaluation: EvaluatedRequestFields): boolean {
  // An unmatched category is never written, so it can't keep re-triggering an update every load.
  return evaluation.serviceCategory != null && request.dis_servicecategory?.[0] !== evaluation.serviceCategory;
}

/** True when any persisted derived field differs from a fresh evaluation. */
function hasEvaluationChanged(request: Dis_discountrequests, evaluation: EvaluatedRequestFields): boolean {
  return (
    isServiceCategoryStale(request, evaluation) ||
    request._dis_authorizedbyname_value !== evaluation.authorizedBySystemUserId ||
    request.dis_authorizedbyposition !== evaluation.authorizedByPosition ||
    request.dis_timeblock !== evaluation.timeBlock ||
    request._dis_matchedmatrixrule_value !== evaluation.matchedMatrixRuleId ||
    request.dis_authorizedlimit !== evaluation.authorizedLimit ||
    request.dis_overageaboveauthority !== evaluation.overageAboveAuthority ||
    request.dis_authoritycheck !== evaluation.authorityCheck ||
    request._dis_agent_value !== evaluation.agentSystemUserId
  );
}

function buildEvaluationUpdate(
  request: Dis_discountrequests,
  evaluation: EvaluatedRequestFields
): Partial<Dis_discountrequestsBase> {
  const update: Partial<Dis_discountrequestsBase> = {
    dis_authorizedbyposition: evaluation.authorizedByPosition as Dis_discountrequestsBase['dis_authorizedbyposition'],
    dis_timeblock: evaluation.timeBlock as Dis_discountrequestsBase['dis_timeblock'],
    dis_authorizedlimit: evaluation.authorizedLimit,
    dis_overageaboveauthority: evaluation.overageAboveAuthority,
    dis_authoritycheck: evaluation.authorityCheck as Dis_discountrequestsBase['dis_authoritycheck'],
  };
  if (isServiceCategoryStale(request, evaluation)) {
    update.dis_servicecategory = [evaluation.serviceCategory as Dis_discountrequestsdis_servicecategory];
  }
  if (evaluation.authorizedBySystemUserId) {
    update['dis_AuthorizedByName@odata.bind'] = `/systemusers(${evaluation.authorizedBySystemUserId})`;
  }
  if (evaluation.matchedMatrixRuleId) {
    update['dis_MatchedMatrixRule@odata.bind'] = `/dis_discountlimitmatrixes(${evaluation.matchedMatrixRuleId})`;
  }
  if (evaluation.agentSystemUserId) {
    update['dis_Agent@odata.bind'] = `/systemusers(${evaluation.agentSystemUserId})`;
  }
  return update;
}

/**
 * Recomputes every derived field for every request against the current employee/matrix data,
 * persisting anything that changed (BRL-001..BRL-011 are re-run each load, never cached from a
 * stale prior evaluation) — unless the request is already decision-locked, since BRL-013 forbids
 * touching a locked record's fields at all. Read-only views pass `persist: false`, since their
 * viewers may not have write access to the requests.
 */
export async function evaluateAndSyncRequests(
  requests: Dis_discountrequests[],
  systemUsers: SystemUserLite[],
  matrixRows: MatrixRowLite[],
  { persist = true }: { persist?: boolean } = {}
): Promise<EvaluatedRequest[]> {
  const results: EvaluatedRequest[] = [];
  const updateTasks: (() => Promise<unknown>)[] = [];

  for (const request of requests) {
    const evaluation = evaluateRequest(request, systemUsers, matrixRows);
    if (persist && !request.dis_decisionlocked && hasEvaluationChanged(request, evaluation)) {
      const update = buildEvaluationUpdate(request, evaluation);
      updateTasks.push(() => Dis_discountrequestsService.update(request.dis_discountrequestid, update));
    }
    results.push({ request, evaluation });
  }

  await runWithConcurrency(updateTasks, UPDATE_CONCURRENCY);
  return results;
}
