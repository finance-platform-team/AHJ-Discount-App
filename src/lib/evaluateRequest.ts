import { resolveClosestUser } from './userResolution';
import { derivePositionFromTitle } from './positionDerivation';
import { deriveTimeBlock } from './timeBlock';
import { findMatrixRule } from './matrixLookup';
import { AUTHORITY_OUT, AUTHORITY_WITHIN, DEFAULT_POSITION_PA } from './optionSets';
import type { EvaluatedRequestFields, MatrixRowLite, SystemUserLite } from './types';

export interface RequestInputForEvaluation {
  dis_authorizedbynamedotcare?: string;
  dis_agentdotcare?: string;
  dis_actualcreatedon?: string;
  dis_servicelevel?: number;
  /** dis_servicecategory is a multi-select choice in the live schema; a request carries one true category. */
  dis_servicecategory?: number[];
  dis_totaldiscountpercent?: number;
  dis_totaldiscountamount?: number;
  dis_billtotal?: number;
}

export function evaluateRequest(
  request: RequestInputForEvaluation,
  systemUsers: SystemUserLite[],
  matrixRows: MatrixRowLite[]
): EvaluatedRequestFields {
  const resolution = resolveClosestUser(request.dis_authorizedbynamedotcare, systemUsers);
  const authorizedByPosition = derivePositionFromTitle(resolution.user?.title);
  const timeBlockFromClock = deriveTimeBlock(request.dis_actualcreatedon);
  const agentResolution = resolveClosestUser(request.dis_agentdotcare, systemUsers);

  const serviceCategory = request.dis_servicecategory?.[0];
  const unmatchedService = serviceCategory == null;

  const match = unmatchedService
    ? { tier: 'none' as const, row: undefined as MatrixRowLite | undefined }
    : findMatrixRule(matrixRows, {
        serviceLevel: request.dis_servicelevel,
        timeBlock: timeBlockFromClock,
        serviceCategory,
        position: authorizedByPosition,
      });

  const matchedRow = match.row;
  const totalDiscountPercent = request.dis_totaldiscountpercent ?? 0;
  const totalDiscountAmount = request.dis_totaldiscountamount ?? 0;
  const billTotal = request.dis_billtotal ?? 0;

  let authorizedLimit: number | undefined;
  let overageAboveAuthority: number | undefined;
  let authorityCheck: number;

  if (!matchedRow) {
    authorizedLimit = undefined;
    overageAboveAuthority = undefined;
    authorityCheck = AUTHORITY_OUT;
  } else if (matchedRow.dis_isunlimited) {
    authorizedLimit = matchedRow.dis_authorizedlimitpercent;
    overageAboveAuthority = 0;
    authorityCheck = AUTHORITY_WITHIN;
  } else if (!matchedRow.dis_hasauthority) {
    authorizedLimit = matchedRow.dis_authorizedlimitpercent;
    const rawOverage = totalDiscountAmount - (billTotal * (authorizedLimit ?? 0)) / 100;
    overageAboveAuthority = Math.max(0, rawOverage);
    authorityCheck = AUTHORITY_OUT;
  } else {
    authorizedLimit = matchedRow.dis_authorizedlimitpercent ?? 0;
    const rawOverage = totalDiscountAmount - (billTotal * authorizedLimit) / 100;
    overageAboveAuthority = Math.max(0, rawOverage);
    authorityCheck = totalDiscountPercent > authorizedLimit ? AUTHORITY_OUT : AUTHORITY_WITHIN;
  }

  return {
    authorizedBySystemUserId: resolution.user?.systemuserid,
    authorizedByPosition: authorizedByPosition ?? DEFAULT_POSITION_PA,
    timeBlock: matchedRow ? matchedRow.dis_timeblock : timeBlockFromClock,
    matchedMatrixRuleId: matchedRow?.dis_discountlimitmatrixid,
    authorizedLimit,
    overageAboveAuthority,
    authorityCheck,
    unmatchedEmployee: resolution.status === 'unmatched',
    ambiguousEmployee: resolution.status === 'ambiguous',
    unmatchedService,
    agentSystemUserId: agentResolution.user?.systemuserid,
    unmatchedAgent: agentResolution.status === 'unmatched',
    ambiguousAgent: agentResolution.status === 'ambiguous',
  };
}
