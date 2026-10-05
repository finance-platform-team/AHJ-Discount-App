import { resolveClosestUser } from './userResolution';
import { derivePositionFromTitle } from './positionDerivation';
import { deriveTimeBlock } from './timeBlock';
import { findMatrixRule } from './matrixLookup';
import { mapDotcareServiceCategory } from './serviceCategoryMapping';
import { AUTHORITY_OUT, AUTHORITY_WITHIN, DEFAULT_POSITION_PA } from './optionSets';
import type { EvaluatedRequestFields, MatrixRowLite, SystemUserLite } from './types';

export interface RequestInputForEvaluation {
  dis_authorizedbynamedotcare?: string;
  dis_agentdotcare?: string;
  dis_actualcreatedon?: string;
  dis_servicelevel?: number;
  /** Raw DotCare category name (EnName) — the only source of the matrix Service Category. */
  dis_servicecategorydotcare?: string;
  dis_totaldiscountpercent?: number;
  dis_totaldiscountamount?: number;
  dis_billtotal?: number;
}

type AuthorityAssessment = Pick<EvaluatedRequestFields, 'authorizedLimit' | 'overageAboveAuthority' | 'authorityCheck'>;

/** Applies the matched matrix rule (if any) to the request's discount to decide whether it is within authority. */
function assessAuthority(matchedRow: MatrixRowLite | undefined, request: RequestInputForEvaluation): AuthorityAssessment {
  if (!matchedRow) {
    return { authorizedLimit: undefined, overageAboveAuthority: undefined, authorityCheck: AUTHORITY_OUT };
  }
  if (matchedRow.dis_isunlimited) {
    return {
      authorizedLimit: matchedRow.dis_authorizedlimitpercent,
      overageAboveAuthority: 0,
      authorityCheck: AUTHORITY_WITHIN,
    };
  }

  const hasAuthority = !!matchedRow.dis_hasauthority;
  const limitPercent = matchedRow.dis_authorizedlimitpercent ?? 0;
  const totalDiscountPercent = request.dis_totaldiscountpercent ?? 0;
  const totalDiscountAmount = request.dis_totaldiscountamount ?? 0;
  const billTotal = request.dis_billtotal ?? 0;

  return {
    // A "no authority" rule keeps its raw (possibly empty) limit; an authorized rule defaults to 0%.
    authorizedLimit: hasAuthority ? limitPercent : matchedRow.dis_authorizedlimitpercent,
    overageAboveAuthority: Math.max(0, totalDiscountAmount - (billTotal * limitPercent) / 100),
    authorityCheck: hasAuthority && totalDiscountPercent <= limitPercent ? AUTHORITY_WITHIN : AUTHORITY_OUT,
  };
}

export function evaluateRequest(
  request: RequestInputForEvaluation,
  systemUsers: SystemUserLite[],
  matrixRows: MatrixRowLite[]
): EvaluatedRequestFields {
  const resolution = resolveClosestUser(request.dis_authorizedbynamedotcare, systemUsers);
  const agentResolution = resolveClosestUser(request.dis_agentdotcare, systemUsers);
  const authorizedByPosition = derivePositionFromTitle(resolution.user?.title);
  const timeBlockFromClock = deriveTimeBlock(request.dis_actualcreatedon);

  // DotCare is the only source; a missing or unmapped DotCare category is an unmatched service.
  const serviceCategory = mapDotcareServiceCategory(request.dis_servicecategorydotcare);
  const unmatchedService = serviceCategory == null;

  const matchedRow = unmatchedService
    ? undefined
    : findMatrixRule(matrixRows, {
        serviceLevel: request.dis_servicelevel,
        timeBlock: timeBlockFromClock,
        serviceCategory,
        position: authorizedByPosition,
      }).row;

  return {
    authorizedBySystemUserId: resolution.user?.systemuserid,
    authorizedByPosition: authorizedByPosition ?? DEFAULT_POSITION_PA,
    timeBlock: matchedRow ? matchedRow.dis_timeblock : timeBlockFromClock,
    serviceCategory,
    matchedMatrixRuleId: matchedRow?.dis_discountlimitmatrixid,
    ...assessAuthority(matchedRow, request),
    unmatchedEmployee: resolution.status === 'unmatched',
    ambiguousEmployee: resolution.status === 'ambiguous',
    unmatchedService,
    agentSystemUserId: agentResolution.user?.systemuserid,
    unmatchedAgent: agentResolution.status === 'unmatched',
    ambiguousAgent: agentResolution.status === 'ambiguous',
  };
}
