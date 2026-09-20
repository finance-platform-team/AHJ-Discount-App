import {
  Dis_discountrequestsdis_authoritycheck,
  Dis_discountrequestsdis_authorizedbyposition,
  Dis_discountrequestsdis_requeststatus,
  Dis_discountrequestsdis_servicecategory,
  Dis_discountrequestsdis_servicelevel,
  Dis_discountrequestsdis_timeblock,
} from '../generated/models/Dis_discountrequestsModel';

// All option sets below are shared between dis_discountrequest and dis_discountlimitmatrix
// (same global choices), so the request-side generated consts are used as the single source
// of truth for numeric values and labels — never hardcode/guess these numbers elsewhere.

export const SERVICE_LEVEL = Dis_discountrequestsdis_servicelevel;
export const SERVICE_CATEGORY = Dis_discountrequestsdis_servicecategory;
export const TIME_BLOCK = Dis_discountrequestsdis_timeblock;
export const AUTHORITY_CHECK = Dis_discountrequestsdis_authoritycheck;
export const REQUEST_STATUS = Dis_discountrequestsdis_requeststatus;
export const POSITION = Dis_discountrequestsdis_authorizedbyposition;

export const TIME_BLOCK_WILDCARD = 776940000 as const;
export const AUTHORITY_WITHIN = 776940000 as const;
export const AUTHORITY_OUT = 776940001 as const;
export const REQUEST_APPROVED = 776940000 as const;
export const REQUEST_REJECTED = 776940001 as const;
export const DEFAULT_POSITION_PA = 776940011 as const;
export const STATUSCODE_ACTIVE = 1 as const;

export type PositionCode = keyof typeof POSITION;

/** "CEO – Chief Executive Officer" -> { abbr: "CEO", fullName: "Chief Executive Officer" } */
function splitPositionLabel(label: string): { abbr: string; fullName: string } {
  const [abbr, ...rest] = label.split('–');
  return { abbr: abbr.trim(), fullName: rest.join('–').trim() };
}

export const POSITION_ENTRIES = Object.entries(POSITION).map(([code, label]) => ({
  code: Number(code) as PositionCode,
  label,
  ...splitPositionLabel(label),
}));

export function positionAbbr(code: number | undefined | null): string {
  if (code == null) return '';
  const entry = POSITION_ENTRIES.find((e) => e.code === code);
  return entry?.abbr ?? '';
}

export function serviceLevelLabel(code: number | undefined | null): string {
  if (code == null) return '';
  return (SERVICE_LEVEL as Record<number, string>)[code] ?? '';
}

export function serviceCategoryLabel(code: number | undefined | null): string {
  if (code == null) return '';
  return (SERVICE_CATEGORY as Record<number, string>)[code] ?? '';
}

export function timeBlockLabel(code: number | undefined | null): string {
  if (code == null) return '';
  return (TIME_BLOCK as Record<number, string>)[code] ?? '';
}
