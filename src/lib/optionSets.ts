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

type OptionCode = number | undefined | null;

export function positionAbbr(code: OptionCode): string {
  if (code == null) return '';
  return POSITION_ENTRIES.find((e) => e.code === code)?.abbr ?? '';
}

/** Label for an option-set code, or `''` when the code is missing or unknown. */
function optionLabel(optionSet: Record<number, string>, code: OptionCode): string {
  return code == null ? '' : (optionSet[code] ?? '');
}

export const serviceLevelLabel = (code: OptionCode) => optionLabel(SERVICE_LEVEL, code);
export const serviceCategoryLabel = (code: OptionCode) => optionLabel(SERVICE_CATEGORY, code);
export const timeBlockLabel = (code: OptionCode) => optionLabel(TIME_BLOCK, code);

/**
 * Option code for a label. The label is type-checked against the generated option set, so a
 * renamed choice fails the build instead of silently resolving to nothing.
 */
export function codeByLabel<C extends number, L extends string>(optionSet: Record<C, L>, label: L): C {
  const entry = Object.entries<L>(optionSet).find(([, l]) => l === label);
  return Number(entry![0]) as C;
}

/** Service Category choice codes, resolved by label (the numeric values were reassigned once already). */
export const SERVICE_CATEGORY_CODE = {
  Consultation: codeByLabel(SERVICE_CATEGORY, 'Consultation'),
  LabAndRad: codeByLabel(SERVICE_CATEGORY, 'Lab & Rad'),
  Dental: codeByLabel(SERVICE_CATEGORY, 'Dental without Prosthesis'),
  HomeCare: codeByLabel(SERVICE_CATEGORY, 'Home Care'),
  ORPackages: codeByLabel(SERVICE_CATEGORY, 'OR Packages'),
  Mortality: codeByLabel(SERVICE_CATEGORY, 'Mortality'),
  DAMA: codeByLabel(SERVICE_CATEGORY, 'DAMA'),
  Medications: codeByLabel(SERVICE_CATEGORY, 'Medications'),
  Procedures: codeByLabel(SERVICE_CATEGORY, 'Procedures'),
};

/** `{ value, label }` pairs for rendering an option set as `<select>` options. */
export function toSelectOptions<T extends number>(optionSet: Record<T, string>): { value: T; label: string }[] {
  return Object.entries<string>(optionSet).map(([value, label]) => ({ value: Number(value) as T, label }));
}
