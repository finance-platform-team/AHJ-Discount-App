import type { Dis_discountrequests } from '../generated/models/Dis_discountrequestsModel';
import type { CurrentUser } from './currentUser';
import type { EvaluatedRequestFields } from './types';

/** Security role that may see every discount request on every screen. */
export const FULL_ACCESS_ROLES = ['Discount App Admin'];

/** Security role restricted to their own records (plus the Authority Matrix). */
export const DISCOUNT_BASIC_USER_ROLE = 'Discount Basic User';

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

/** The DotCare free-text name each owner lookup is resolved from. */
const OWNER_DOTCARE_NAME: Record<RequestScopeKind, 'dis_authorizedbynamedotcare' | 'dis_agentdotcare'> = {
  authorizedBy: 'dis_authorizedbynamedotcare',
  enteredBy: 'dis_agentdotcare',
};

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Requests whose owner lookup is still unset (new from DotCare). Only their id and DotCare owner
 * name are fetched; the viewer then fetches in full just the ones whose name resolves to them.
 */
export interface UnresolvedOwnerScope {
  filter: string;
  nameField: 'dis_authorizedbynamedotcare' | 'dis_agentdotcare';
  systemUserId: string;
}

export interface RequestScope {
  /** False when the viewer may not see any request at all — skip fetching entirely. */
  canView: boolean;
  /** OData $filter that narrows the fetch server-side; undefined fetches every request. */
  filter?: string;
  /** Set for restricted viewers: how to claim their own not-yet-resolved requests. */
  unresolved?: UnresolvedOwnerScope;
  /** Final per-row check against the request's actual owner (see `ownerOf`). */
  includes: (request: Dis_discountrequests, evaluation: EvaluatedRequestFields) => boolean;
}

export function hasFullAccess(user: CurrentUser | null): boolean {
  return !!user && user.roleNames.some((role) => FULL_ACCESS_ROLES.includes(role));
}

/**
 * Whether the user may use the app at all (secure by default): only a full-access role or the
 * Discount Basic User role gets in; anyone else — including an account that could not be
 * resolved to a systemuser — is shown the no-access screen.
 */
export function hasAppAccess(user: CurrentUser | null): boolean {
  return hasFullAccess(user) || (!!user && user.roleNames.includes(DISCOUNT_BASIC_USER_ROLE));
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
 * The requests `user` may see on a screen scoped by `kind`. Restricted users fully fetch only the
 * rows whose owner lookup is them. A brand-new request has no lookup yet (the owner is resolved
 * from DotCare's free-text name), so `unresolved` lets them claim those by name without
 * downloading anyone else's request details.
 */
export function requestScopeFor(kind: RequestScopeKind, user: CurrentUser | null): RequestScope {
  if (hasFullAccess(user)) return ALLOW_ALL;
  if (!user || !hasAppAccess(user) || !GUID.test(user.systemUserId)) return DENY_ALL;

  const lookup = OWNER_LOOKUP[kind];
  const id = user.systemUserId.toLowerCase();
  return {
    canView: true,
    filter: `${lookup} eq ${id}`,
    unresolved: { filter: `${lookup} eq null`, nameField: OWNER_DOTCARE_NAME[kind], systemUserId: id },
    includes: (request, evaluation) => ownerOf(kind, request, evaluation)?.toLowerCase() === id,
  };
}
