import { fetchSystemUsers, fetchMatrixRows, fetchRequests, evaluateAndSyncRequests } from './dataSync';
import { buildRowViewModel, type RequestRowViewModel } from './rowViewModel';
import type { CurrentUser } from './currentUser';
import type { RequestScope } from './accessScope';
import type { SystemUserLite } from './types';

interface LoadRequestRowsOptions {
  /** Write changed derived fields back to Dataverse (default on). */
  persist?: boolean;
  /** Extra OData $filter the screen needs on top of the access scope (e.g. decided requests only). */
  filter?: string;
}

/**
 * Fetches, evaluates and shapes the requests `scope` lets the viewer see. The scope's filter runs
 * server-side, so other users' records are never downloaded; its row check then drops any fetched
 * row (an unresolved one) whose evaluated owner isn't the viewer.
 */
export async function loadRequestRows(
  currentUser: CurrentUser | null,
  scope: RequestScope,
  { persist = true, filter }: LoadRequestRowsOptions = {}
): Promise<RequestRowViewModel[]> {
  if (!scope.canView) return [];
  const combinedFilter = [scope.filter, filter].filter(Boolean).join(' and ') || undefined;
  const [systemUsers, matrixRows, requests] = await Promise.all([
    fetchSystemUsers(),
    fetchMatrixRows(),
    fetchRequests(combinedFilter),
  ]);
  const systemUsersById = new Map<string, SystemUserLite>(systemUsers.map((u) => [u.systemuserid, u]));
  const evaluated = await evaluateAndSyncRequests(requests, systemUsers, matrixRows, { persist });
  return evaluated
    .filter(({ request, evaluation }) => scope.includes(request, evaluation))
    .map(({ request, evaluation }) =>
      buildRowViewModel(request, evaluation, systemUsersById, currentUser?.systemUserId ?? null)
    );
}
