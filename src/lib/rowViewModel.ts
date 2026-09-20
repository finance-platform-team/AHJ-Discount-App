import type { Dis_discountrequests } from '../generated/models/Dis_discountrequestsModel';
import type { EmployeeLite, EvaluatedRequestFields } from './types';
import { positionAbbr, serviceCategoryLabel, serviceLevelLabel, timeBlockLabel, AUTHORITY_OUT } from './optionSets';

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
  createdOn: string;
  decisionLocked: boolean;
  isOutOfYourAuthority: boolean;
}

export function buildRowViewModel(
  request: Dis_discountrequests,
  evaluation: EvaluatedRequestFields,
  employeesById: Map<string, EmployeeLite>,
  currentUserSystemUserId: string | null
): RequestRowViewModel {
  const employee = evaluation.authorizedByEmployeeId ? employeesById.get(evaluation.authorizedByEmployeeId) : undefined;

  const authorizedByDisplay = employee
    ? `${employee.hr_fullname?.trim().replace(/\s+/g, ' ') ?? ''} (${positionAbbr(evaluation.authorizedByPosition)})`
    : request.dis_authorizedbynamedotcare ?? '';

  const isOutOfYourAuthority =
    !!currentUserSystemUserId &&
    evaluation.authorityCheck === AUTHORITY_OUT &&
    !!employee?._hr_user_value &&
    employee._hr_user_value === currentUserSystemUserId;

  return {
    id: request.dis_discountrequestid,
    request,
    evaluation,
    patientName: request.dis_patientname ?? '',
    patientId: request.dis_patientid ?? '',
    visitId: request.dis_visitid ?? '',
    serviceCategory: evaluation.unmatchedService ? '' : serviceCategoryLabel(request.dis_servicecategory?.[0]),
    serviceName: request.dis_servicename ?? '',
    serviceLevel: serviceLevelLabel(request.dis_servicelevel),
    timeBlock: timeBlockLabel(evaluation.timeBlock),
    totalDiscountPercent: request.dis_totaldiscountpercent ?? 0,
    totalDiscountAmount: request.dis_totaldiscountamount ?? 0,
    billTotal: request.dis_billtotal ?? 0,
    authorizedLimit: evaluation.authorizedLimit,
    overageAboveAuthority: evaluation.overageAboveAuthority,
    isOutOfAuthority: evaluation.authorityCheck === AUTHORITY_OUT,
    authorizedByDisplay,
    agentName: request.dis_agentname ?? '',
    reason: request.dis_reason ?? '',
    note: request.dis_note ?? '',
    requestStatus: request.dis_requeststatus,
    createdOn: request.createdon ?? '',
    decisionLocked: !!request.dis_decisionlocked,
    isOutOfYourAuthority,
  };
}
