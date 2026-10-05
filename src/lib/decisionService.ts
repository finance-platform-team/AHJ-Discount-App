import { Dis_discountrequestsService } from '../generated/services/Dis_discountrequestsService';
import type { Dis_discountrequestsBase } from '../generated/models/Dis_discountrequestsModel';
import { REQUEST_APPROVED, REQUEST_REJECTED } from './optionSets';

export class DecisionLockedError extends Error {
  constructor() {
    super('This request has already been decided and is locked.');
  }
}

/** BRL-013: every decision write re-checks the lock against the server record first — never trusts client state. */
async function assertNotLocked(requestId: string): Promise<void> {
  const current = await Dis_discountrequestsService.get(requestId, { select: ['dis_decisionlocked'] });
  if (current.data?.dis_decisionlocked) {
    throw new DecisionLockedError();
  }
}

/** Writes a final decision and locks the record so it can never be decided (or re-evaluated) again. */
async function recordDecision(
  requestId: string,
  decidedBySystemUserId: string,
  fields: Partial<Dis_discountrequestsBase>
): Promise<void> {
  await assertNotLocked(requestId);
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
