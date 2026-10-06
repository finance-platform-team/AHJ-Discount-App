import { Dis_discountrequestsService } from '../generated/services/Dis_discountrequestsService';
import type { Dis_discountrequestsBase } from '../generated/models/Dis_discountrequestsModel';
import { REQUEST_APPROVED, REQUEST_REJECTED } from './optionSets';

export class DecisionLockedError extends Error {
  constructor() {
    super('This request has already been decided and is locked.');
  }
}

export class NotAuthorizedToDecideError extends Error {
  constructor() {
    super('Only the Authorized By of this request can approve or reject it.');
  }
}

/**
 * BRL-013: before every decision write, re-reads the request from Dataverse rather than trusting
 * the grid's copy — it must still be open, and its persisted Authorized By must be the decider.
 * This runs in the browser, so it guards the app's own flow; it is not a server-side control.
 */
async function assertCanDecide(requestId: string, decidedBySystemUserId: string): Promise<void> {
  const current = await Dis_discountrequestsService.get(requestId, {
    select: ['dis_decisionlocked', '_dis_authorizedbyname_value'],
  });
  if (current.data?.dis_decisionlocked) {
    throw new DecisionLockedError();
  }
  if (current.data?._dis_authorizedbyname_value?.toLowerCase() !== decidedBySystemUserId.toLowerCase()) {
    throw new NotAuthorizedToDecideError();
  }
}

/** Writes a final decision and locks the record so it can never be decided (or re-evaluated) again. */
async function recordDecision(
  requestId: string,
  decidedBySystemUserId: string,
  fields: Partial<Dis_discountrequestsBase>
): Promise<void> {
  await assertCanDecide(requestId, decidedBySystemUserId);
  await Dis_discountrequestsService.update(requestId, {
    ...fields,
    dis_decisiondate: new Date().toISOString(),
    dis_decisionlocked: true,
    'dis_DecidedBy@odata.bind': `/systemusers(${decidedBySystemUserId})`,
  });
}

export function leaveApproved(requestId: string, decidedBySystemUserId: string): Promise<void> {
  return recordDecision(requestId, decidedBySystemUserId, { dis_requeststatus: REQUEST_APPROVED });
}

export async function reject(
  requestId: string,
  decidedBySystemUserId: string,
  decisionComment: string
): Promise<void> {
  const comment = decisionComment.trim();
  if (!comment) {
    throw new Error('A justification is required to reject a request.');
  }
  await recordDecision(requestId, decidedBySystemUserId, {
    dis_requeststatus: REQUEST_REJECTED,
    dis_decisioncomment: comment,
  });
}
