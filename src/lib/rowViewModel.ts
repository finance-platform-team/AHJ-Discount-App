import type { Dis_discountrequests } from '../generated/models/Dis_discountrequestsModel';
import type { EvaluatedRequestFields, SystemUserLite } from './types';
import { positionAbbr, serviceCategoryLabel, serviceLevelLabel, timeBlockLabel, AUTHORITY_OUT } from './optionSets';
import { collapseWhitespace } from './textUtils';
import { derivePositionFromTitle } from './positionDerivation';

export interface RequestRowViewModel {
  id: string;
  request: Dis_discountrequests;
  evaluation: EvaluatedRequestFields;
  patientName: string;
  patientId: string;
  visitId: string;
  serviceCategory: string;
  serviceName: string;
  serviceLevel: string;
  timeBlock: string;
  totalDiscountPercent: number;
  totalDiscountAmount: number;
  billTotal: number;
  authorizedLimit?: number;
  overageAboveAuthority?: number;
  isOutOfAuthority: boolean;
  authorizedByDisplay: string;
  agentName: string;
  reason: string;
  note: string;
  requestStatus?: number;
  /** DotCare's own request time (dis_actualcreatedon) — also what the time block is derived from. */
  actualCreatedOn: string;
  decisionLocked: boolean;
  decisionComment: string;
  decidedByName: string;
  /** Position abbreviation (e.g. "MD") of whoever recorded the decision, derived from their job title. */
  decidedByRole: string;
  decisionDate: string;
  isOutOfYourAuthority: boolean;
  /** Only the request's own Authorized By may approve or reject it, and only while it is open. */
  canDecide: boolean;
}

export function buildRowViewModel(
  request: Dis_discountrequests,
  evaluation: EvaluatedRequestFields,
  systemUsersById: Map<string, SystemUserLite>,
  currentUserSystemUserId: string | null
): RequestRowViewModel {
  /** Cleaned full name of a loaded system user, or `''` when the id is missing/unknown. */
  const userName = (systemUserId: string | undefined) =>
    collapseWhitespace(systemUserId ? systemUsersById.get(systemUserId)?.fullname : undefined);

  const authorizedBy = evaluation.authorizedBySystemUserId
    ? systemUsersById.get(evaluation.authorizedBySystemUserId)
    : undefined;
  const authorizedByDisplay = authorizedBy
    ? `${collapseWhitespace(authorizedBy.fullname)} (${positionAbbr(evaluation.authorizedByPosition)})`
    : request.dis_authorizedbynamedotcare ?? '';

  const agentName =
    userName(evaluation.agentSystemUserId) || request.dis_agentname || request.dis_agentdotcare || '';

  // The SDK returns the lookup id but not its formatted name, so resolve Decided By from the loaded system users.
  const decidedByName = userName(request._dis_decidedby_value) || request.dis_decidedbyname || '';
  const decidedBy = request._dis_decidedby_value ? systemUsersById.get(request._dis_decidedby_value) : undefined;
  const decidedByRole = decidedBy ? positionAbbr(derivePositionFromTitle(decidedBy.title)) : '';

  const isOutOfAuthority = evaluation.authorityCheck === AUTHORITY_OUT;
  const isAuthorizedByViewer =
    !!currentUserSystemUserId &&
    evaluation.authorizedBySystemUserId?.toLowerCase() === currentUserSystemUserId.toLowerCase();
  const isOutOfYourAuthority = isAuthorizedByViewer && isOutOfAuthority;

  return {
    id: request.dis_discountrequestid,
    request,
    evaluation,
    patientName: request.dis_patientname ?? '',
    patientId: request.dis_patientid ?? '',
    visitId: request.dis_visitid ?? '',
    serviceCategory: serviceCategoryLabel(evaluation.serviceCategory),
    serviceName: request.dis_servicename ?? '',
    serviceLevel: serviceLevelLabel(request.dis_servicelevel),
    timeBlock: timeBlockLabel(evaluation.timeBlock),
    totalDiscountPercent: request.dis_totaldiscountpercent ?? 0,
    totalDiscountAmount: request.dis_totaldiscountamount ?? 0,
    billTotal: request.dis_billtotal ?? 0,
    authorizedLimit: evaluation.authorizedLimit,
    overageAboveAuthority: evaluation.overageAboveAuthority,
    isOutOfAuthority,
    authorizedByDisplay,
    agentName,
    reason: request.dis_reason ?? '',
    note: request.dis_note ?? '',
    requestStatus: request.dis_requeststatus,
    actualCreatedOn: request.dis_actualcreatedon ?? '',
    decisionLocked: !!request.dis_decisionlocked,
    decisionComment: request.dis_decisioncomment ?? '',
    decidedByName,
    decidedByRole,
    decisionDate: request.dis_decisiondate ?? '',
    isOutOfYourAuthority,
    canDecide: isAuthorizedByViewer && !request.dis_decisionlocked,
  };
}
