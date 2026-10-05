import type { Dis_discountrequests } from '../generated/models/Dis_discountrequestsModel';
import type { CurrentUser } from './currentUser';
import type { EvaluatedRequestFields } from './types';

/**
 * Security roles that may see every discount request on every screen. Everyone else is restricted
 * to their own records (secure by default): a user with no matching role, or whose account could
 * not be resolved to a systemuser, sees nothing rather than everything.
 */
export const FULL_ACCESS_ROLES = ['System Administrator'];

/** Which person on the request "owns" it, per screen. */
export type RequestScopeKind = 'authorizedBy' | 'enteredBy';

const OWNER_LOOKUP: Record<RequestScopeKind, '_dis_authorizedbyname_value' | '_dis_agent_value'> = {
  authorizedBy: '_dis_authorizedbyname_value',
  enteredBy: '_dis_agent_value',
};

const OWNER_EVALUATED: Record<RequestScopeKind, (e: EvaluatedRequestFields) => string | undefined> = {
  authorizedBy: (e) => e.authorizedBySystemUserId,
  enteredBy: (e) => e.agentSystemUserId,
};

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RequestScope {
  /** False when the viewer may not see any request at all — skip fetching entirely. */
  canView: boolean;
  /** OData $filter that narrows the fetch server-side; undefined fetches every request. */
  filter?: string;
  /** Final per-row check against the request's actual owner (see `ownerOf`). */
  includes: (request: Dis_discountrequests, evaluation: EvaluatedRequestFields) => boolean;
}

export function hasFullAccess(user: CurrentUser | null): boolean {
  return !!user && user.roleNames.some((role) => FULL_ACCESS_ROLES.includes(role));
}

/**
 * A decision-locked request keeps its persisted owner (BRL-013 freezes it); an open one is
 * re-evaluated every load, so the fresh evaluation wins over a stale or still-unset lookup.
 */
function ownerOf(kind: RequestScopeKind, request: Dis_discountrequests, evaluation: EvaluatedRequestFields) {
  const persisted = request[OWNER_LOOKUP[kind]];
  return request.dis_decisionlocked && persisted ? persisted : OWNER_EVALUATED[kind](evaluation);
}

const DENY_ALL: RequestScope = { canView: false, includes: () => false };
const ALLOW_ALL: RequestScope = { canView: true, includes: () => true };

/**
 * The requests `user` may see on a screen scoped by `kind`. Restricted users only fetch the rows
 * whose owner lookup is them — plus rows whose lookup is still unset, because the owner is resolved
 * from DotCare's free-text name on load and a brand-new request has no lookup yet. Those unresolved
 * rows are evaluated (and persisted, where allowed) and then dropped unless they resolve to the user.
 */
export function requestScopeFor(kind: RequestScopeKind, user: CurrentUser | null): RequestScope {
  if (hasFullAccess(user)) return ALLOW_ALL;
  if (!user || !GUID.test(user.systemUserId)) return DENY_ALL;

  const lookup = OWNER_LOOKUP[kind];
  const id = user.systemUserId.toLowerCase();
  return {
    canView: true,
    filter: `(${lookup} eq ${id} or ${lookup} eq null)`,
    includes: (request, evaluation) => ownerOf(kind, request, evaluation)?.toLowerCase() === id,
  };
}
