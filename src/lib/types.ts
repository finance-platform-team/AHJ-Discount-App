export interface EmployeeLite {
  hr_employeeid: string;
  hr_numberofhrcode?: string;
  hr_fullname?: string;
  hr_positionname?: string;
  _hr_user_value?: string;
}

export interface MatrixRowLite {
  dis_discountlimitmatrixid: string;
  dis_servicelevel?: number;
  dis_timeblock?: number;
  dis_servicecategory?: number;
  dis_position?: number;
  dis_authorizedlimitpercent?: number;
  dis_hasauthority?: boolean;
  dis_isunlimited?: boolean;
  statuscode?: number;
}

export type EmployeeResolutionStatus = 'matched' | 'unmatched' | 'ambiguous';

export interface EmployeeResolutionResult {
  status: EmployeeResolutionStatus;
  employee?: EmployeeLite;
}

export type MatrixMatchTier = 'specific' | 'wildcard' | 'none';

export interface MatrixMatchResult {
  tier: MatrixMatchTier;
  row?: MatrixRowLite;
}

/** Computed fields this app derives for a discount request before it can be displayed/decided. */
export interface EvaluatedRequestFields {
  authorizedByEmployeeId?: string;
  authorizedByPosition: number;
  timeBlock?: number;
  matchedMatrixRuleId?: string;
  authorizedLimit?: number;
  overageAboveAuthority?: number;
  authorityCheck: number;
  unmatchedEmployee: boolean;
  ambiguousEmployee: boolean;
  unmatchedService: boolean;
}
