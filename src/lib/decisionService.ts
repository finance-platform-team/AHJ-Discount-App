import { Dis_discountrequestsService } from '../generated/services/Dis_discountrequestsService';
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

export async function leaveApproved(requestId: string, decidedBySystemUserId: string): Promise<void> {
  await assertNotLocked(requestId);
  await Dis_discountrequestsService.update(requestId, {
    dis_requeststatus: REQUEST_APPROVED,
    dis_decisiondate: new Date().toISOString(),
    dis_decisionlocked: true,
    'dis_DecidedBy@odata.bind': `/systemusers(${decidedBySystemUserId})`,
  });
}

export async function reject(
  requestId: string,
  decidedBySystemUserId: string,
  decisionComment: string
): Promise<void> {
  if (!decisionComment.trim()) {
    throw new Error('A justification is required to reject a request.');
  }
  await assertNotLocked(requestId);
  await Dis_discountrequestsService.update(requestId, {
    dis_requeststatus: REQUEST_REJECTED,
    dis_decisioncomment: decisionComment.trim(),
    dis_decisiondate: new Date().toISOString(),
    dis_decisionlocked: true,
    'dis_DecidedBy@odata.bind': `/systemusers(${decidedBySystemUserId})`,
  });
}
