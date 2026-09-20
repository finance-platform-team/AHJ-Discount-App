import { Dis_discountlimitmatrixesService } from '../generated/services/Dis_discountlimitmatrixesService';
import { Dis_discountrequestsService } from '../generated/services/Dis_discountrequestsService';
import { Hr_employeesService } from '../generated/services/Hr_employeesService';
import type { Dis_discountrequests, Dis_discountrequestsBase } from '../generated/models/Dis_discountrequestsModel';
import { evaluateRequest } from './evaluateRequest';
import type { EmployeeLite, EvaluatedRequestFields, MatrixRowLite } from './types';
import type { IGetAllOptions } from '../generated/models/CommonModels';

async function fetchAll<T>(
  getAll: (options: IGetAllOptions) => Promise<{ data?: T[]; skipToken?: string }>,
  baseOptions: IGetAllOptions
): Promise<T[]> {
  const all: T[] = [];
  let skipToken: string | undefined;
  do {
    const result = await getAll({ ...baseOptions, skipToken });
    all.push(...(result.data ?? []));
    skipToken = result.skipToken;
  } while (skipToken);
  return all;
}

export async function fetchEmployees(): Promise<EmployeeLite[]> {
  const records = await fetchAll(
    (options) => Hr_employeesService.getAll(options),
    { select: ['hr_employeeid', 'hr_numberofhrcode', 'hr_fullname', 'hr_positionname', 'hr_user'], maxPageSize: 5000 }
  );
  return records.map((r) => ({
    hr_employeeid: r.hr_employeeid,
    hr_numberofhrcode: r.hr_numberofhrcode,
    hr_fullname: r.hr_fullname,
    hr_positionname: r.hr_positionname,
    _hr_user_value: r._hr_user_value,
  }));
}

export async function fetchMatrixRows(): Promise<MatrixRowLite[]> {
  const records = await fetchAll(
    (options) => Dis_discountlimitmatrixesService.getAll(options),
    {
      select: [
        'dis_discountlimitmatrixid',
        'dis_servicelevel',
        'dis_timeblock',
        'dis_servicecategory',
        'dis_position',
        'dis_authorizedlimitpercent',
        'dis_hasauthority',
        'dis_isunlimited',
        'statuscode',
      ],
      maxPageSize: 5000,
    }
  );
  return records as unknown as MatrixRowLite[];
}

export async function fetchRequests(): Promise<Dis_discountrequests[]> {
  return fetchAll(
    (options) => Dis_discountrequestsService.getAll(options),
    { maxPageSize: 5000, orderBy: ['createdon desc'] }
  );
}

export interface EvaluatedRequest {
  request: Dis_discountrequests;
  evaluation: EvaluatedRequestFields;
}

/**
 * Recomputes every derived field for every request against the current employee/matrix data,
 * persisting anything that changed (BRL-001..BRL-011 are re-run each load, never cached from a
 * stale prior evaluation) — unless the request is already decision-locked, since BRL-013 forbids
 * touching a locked record's fields at all.
 */
export async function evaluateAndSyncRequests(
  requests: Dis_discountrequests[],
  employees: EmployeeLite[],
  matrixRows: MatrixRowLite[]
): Promise<EvaluatedRequest[]> {
  const results: EvaluatedRequest[] = [];

  for (const request of requests) {
    const evaluation = evaluateRequest(
      {
        dis_authorizedbynamedotcare: request.dis_authorizedbynamedotcare,
        dis_actualcreatedon: request.dis_actualcreatedon,
        dis_servicelevel: request.dis_servicelevel,
        dis_servicecategory: request.dis_servicecategory,
        dis_totaldiscountpercent: request.dis_totaldiscountpercent,
        dis_totaldiscountamount: request.dis_totaldiscountamount,
        dis_billtotal: request.dis_billtotal,
      },
      employees,
      matrixRows
    );

    if (!request.dis_decisionlocked) {
      const changed =
        request._dis_authorizedbyname_value !== evaluation.authorizedByEmployeeId ||
        request.dis_authorizedbyposition !== evaluation.authorizedByPosition ||
        request.dis_timeblock !== evaluation.timeBlock ||
        request._dis_matchedmatrixrule_value !== evaluation.matchedMatrixRuleId ||
        request.dis_authorizedlimit !== evaluation.authorizedLimit ||
        request.dis_overageaboveauthority !== evaluation.overageAboveAuthority ||
        request.dis_authoritycheck !== evaluation.authorityCheck;

      if (changed) {
        const update: Partial<Dis_discountrequestsBase> = {
          dis_authorizedbyposition: evaluation.authorizedByPosition as Dis_discountrequestsBase['dis_authorizedbyposition'],
          dis_timeblock: evaluation.timeBlock as Dis_discountrequestsBase['dis_timeblock'],
          dis_authorizedlimit: evaluation.authorizedLimit,
          dis_overageaboveauthority: evaluation.overageAboveAuthority,
          dis_authoritycheck: evaluation.authorityCheck as Dis_discountrequestsBase['dis_authoritycheck'],
        };
        if (evaluation.authorizedByEmployeeId) {
          update['dis_AuthorizedByName@odata.bind'] = `/hr_employees(${evaluation.authorizedByEmployeeId})`;
        }
        if (evaluation.matchedMatrixRuleId) {
          update['dis_MatchedMatrixRule@odata.bind'] = `/dis_discountlimitmatrixes(${evaluation.matchedMatrixRuleId})`;
        }
        await Dis_discountrequestsService.update(request.dis_discountrequestid, update);
      }
    }

    results.push({ request, evaluation });
  }

  return results;
}
