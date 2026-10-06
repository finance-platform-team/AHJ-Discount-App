import { fetchSystemUsers, fetchMatrixRows, fetchRequests, evaluateAndSyncRequests } from './dataSync';
import { buildRowViewModel, type RequestRowViewModel } from './rowViewModel';
import { resolveClosestUser } from './userResolution';
import type { Dis_discountrequests } from '../generated/models/Dis_discountrequestsModel';
import type { CurrentUser } from './currentUser';
import type { RequestScope, UnresolvedOwnerScope } from './accessScope';
import type { SystemUserLite } from './types';

interface LoadRequestRowsOptions {
  /** Write changed derived fields back to Dataverse (default on). */
  persist?: boolean;
  /** Extra OData $filter the screen needs on top of the access scope (e.g. decided requests only). */
  filter?: string;
}

/** Ids per `or` filter when re-fetching claimed requests, keeping the request URL short. */
const IDS_PER_QUERY = 25;

const and = (...filters: (string | undefined)[]) => filters.filter(Boolean).join(' and ') || undefined;

/** Id and DotCare owner name of every not-yet-resolved request on the screen — nothing else. */
function fetchUnresolvedCandidates(unresolved: UnresolvedOwnerScope, screenFilter: string | undefined) {
  return fetchRequests(and(unresolved.filter, screenFilter), ['dis_discountrequestid', unresolved.nameField]);
}

/**
 * The viewer's own requests among the unresolved `candidates`: just the ones whose DotCare owner
 * name resolves to the viewer are fetched in full — so no other user's request details ever reach
 * this browser.
 */
async function claimUnresolvedRequests(
  candidates: Dis_discountrequests[],
  unresolved: UnresolvedOwnerScope,
  screenFilter: string | undefined,
  systemUsers: SystemUserLite[]
): Promise<Dis_discountrequests[]> {
  const resolvesToViewer = (r: Dis_discountrequests) =>
    resolveClosestUser(r[unresolved.nameField], systemUsers).user?.systemuserid.toLowerCase() ===
    unresolved.systemUserId;
  const ids = candidates.filter(resolvesToViewer).map((r) => r.dis_discountrequestid);

  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += IDS_PER_QUERY) batches.push(ids.slice(i, i + IDS_PER_QUERY));
  const results = await Promise.all(
    batches.map((batch) => {
      const idFilter = batch.map((id) => `dis_discountrequestid eq ${id}`).join(' or ');
      return fetchRequests(and(`(${idFilter})`, unresolved.filter, screenFilter));
    })
  );
  return results.flat();
}

const newestFirst = (a: Dis_discountrequests, b: Dis_discountrequests) =>
  (b.createdon ?? '').localeCompare(a.createdon ?? '');

/**
 * Fetches, evaluates and shapes the requests `scope` lets the viewer see. The scope's filter runs
 * server-side and unresolved requests are claimed by name only, so other users' records are never
 * downloaded — or written to; the final row check drops anything whose evaluated owner isn't the viewer.
 */
export async function loadRequestRows(
  currentUser: CurrentUser | null,
  scope: RequestScope,
  { persist = true, filter }: LoadRequestRowsOptions = {}
): Promise<RequestRowViewModel[]> {
  if (!scope.canView) return [];
  const { unresolved } = scope;
  // Every independent fetch runs at once; only the claimed rows have to wait for the user list.
  const [systemUsers, matrixRows, owned, candidates] = await Promise.all([
    fetchSystemUsers(),
    fetchMatrixRows(),
    fetchRequests(and(scope.filter, filter)),
    unresolved ? fetchUnresolvedCandidates(unresolved, filter) : [],
  ]);
  const claimed =
    unresolved && candidates.length > 0
      ? await claimUnresolvedRequests(candidates, unresolved, filter, systemUsers)
      : [];
  const requests = claimed.length > 0 ? [...owned, ...claimed].sort(newestFirst) : owned;

  const systemUsersById = new Map<string, SystemUserLite>(systemUsers.map((u) => [u.systemuserid, u]));
  const evaluated = await evaluateAndSyncRequests(requests, systemUsers, matrixRows, { persist });
  return evaluated
    .filter(({ request, evaluation }) => scope.includes(request, evaluation))
    .map(({ request, evaluation }) =>
      buildRowViewModel(request, evaluation, systemUsersById, currentUser?.systemUserId ?? null)
    );
}
