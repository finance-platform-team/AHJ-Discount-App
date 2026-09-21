export interface SystemUserLite {
  systemuserid: string;
  fullname?: string;
  title?: string;
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

export type UserResolutionStatus = 'matched' | 'unmatched' | 'ambiguous';

export interface UserResolutionResult {
  status: UserResolutionStatus;
  user?: SystemUserLite;
}

export type MatrixMatchTier = 'specific' | 'wildcard' | 'none';

export interface MatrixMatchResult {
  tier: MatrixMatchTier;
  row?: MatrixRowLite;
}

/** Computed fields this app derives for a discount request before it can be displayed/decided. */
export interface EvaluatedRequestFields {
  authorizedBySystemUserId?: string;
  authorizedByPosition: number;
  timeBlock?: number;
  matchedMatrixRuleId?: string;
  authorizedLimit?: number;
  overageAboveAuthority?: number;
  authorityCheck: number;
  unmatchedEmployee: boolean;
  ambiguousEmployee: boolean;
  unmatchedService: boolean;
  agentSystemUserId?: string;
  unmatchedAgent: boolean;
  ambiguousAgent: boolean;
}
