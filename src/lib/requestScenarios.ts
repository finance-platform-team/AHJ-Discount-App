/**
 * The 17 discount-request test scenarios as data (no Dataverse calls), shared by the dev seed and
 * the evaluation tests (requestScenarios.test.ts) so both always exercise exactly the same cases.
 */
import { derivePositionFromTitle } from './positionDerivation';
import { POSITION_ENTRIES, SERVICE_CATEGORY_CODE } from './optionSets';
import type { SystemUserLite } from './types';

// Same global choice codes used by seedMatrixData.ts / the generated model — the single source
// of truth for these numeric values lives in Dis_discountrequestsModel.ts.
const LEVEL = {
  Inpatient: 776940000,
  Outpatient: 776940001,
  ER: 776940002,
} as const;

const CAT = SERVICE_CATEGORY_CODE;

/** Builds an ISO datetime for "today" at a fixed local hour, so dis_actualcreatedon lands in a
 * predictable time block when read back with `new Date(...).getHours()` in this same browser. */
function atHour(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Finds a real systemuser whose `title` already resolves (via the same fuzzy title matcher the
 * app uses at evaluation time) to the desired matrix position, so the seeded request exercises
 * the live Authorized-By + title-derivation logic instead of a fabricated record. */
function userForPosition(users: SystemUserLite[], positionFullName: string): SystemUserLite | undefined {
  const targetCode = POSITION_ENTRIES.find((p) => p.fullName === positionFullName)?.code;
  if (targetCode == null) return undefined;
  return users.find((u) => u.fullname && derivePositionFromTitle(u.title) === targetCode);
}

function authorizedByText(user: SystemUserLite | undefined, fallbackLabel: string): string {
  // Prefixed with an honorific DotCare commonly sends, to exercise the title-stripping in
  // resolveClosestUser as well as the closest-name matching itself.
  if (user?.fullname) return `Mr. ${user.fullname}`;
  // No real systemuser resolves to this position via title — left as free text so the request
  // stays "unmatched" and exercises the default-to-PA fallback, itself a scenario worth testing.
  return fallbackLabel;
}

/** What evaluating a scenario must produce; `null` means "none" (no category / no limit / no overage). */
export interface ExpectedOutcome {
  category: string | null;
  authority: 'Within' | 'Out';
  limit: number | null;
  overage: number | null;
}

export interface RequestSeed {
  suffix: string;
  patientName: string;
  patientId: string;
  visitId: string;
  serviceLevel?: (typeof LEVEL)[keyof typeof LEVEL];
  /** DotCare category name (EnName), mapped to the matrix category at evaluation time. */
  dotcareCategory?: string;
  /** Set directly for matrix categories DotCare has no equivalent for (Mortality, Home Care, DAMA). */
  serviceCategory?: (typeof CAT)[keyof typeof CAT];
  serviceName: string;
  hour: number; // local hour used to derive the time block
  positionFullName?: string; // undefined => deliberately unmatched employee
  billTotal: number;
  discountPercent: number;
  reason: string;
  note: string;
  expectation: string; // human-readable explanation of what this row proves
  expected: ExpectedOutcome;
}

export const SCENARIOS: RequestSeed[] = [
  {
    suffix: '01', patientName: 'Mona Adel', patientId: 'P-10001', visitId: 'V-90001',
    serviceLevel: LEVEL.Inpatient, serviceCategory: CAT.Mortality, serviceName: 'Inpatient Mortality Case',
    hour: 22, positionFullName: 'Chief Executive Officer',
    billTotal: 500000, discountPercent: 70,
    reason: 'Deceased patient family hardship', note: 'CEO unlimited authority — should always read Within Authority.',
    expectation: 'CEO row is unlimited (inf): authorityCheck = Within regardless of % requested.',
    expected: { category: 'Mortality', authority: 'Within', limit: null, overage: 0 },
  },
  {
    suffix: '02', patientName: 'Karim Fathy', patientId: 'P-10002', visitId: 'V-90002',
    serviceLevel: LEVEL.Inpatient, dotcareCategory: 'Packages', serviceName: 'Inpatient OR Package - Knee Surgery',
    hour: 22, positionFullName: 'Chief Operating Officer',
    billTotal: 200000, discountPercent: 45,
    reason: 'Loyalty discount', note: 'COO limit is 50% here — 45% should stay within authority.',
    expectation: 'COO limit 50%, requested 45% => Within Authority, overage 0.',
    expected: { category: 'OR Packages', authority: 'Within', limit: 50, overage: 0 },
  },
  {
    suffix: '03', patientName: 'Karim Fathy', patientId: 'P-10002', visitId: 'V-90003',
    serviceLevel: LEVEL.Inpatient, dotcareCategory: 'Packages', serviceName: 'Inpatient OR Package - Hip Surgery',
    hour: 22, positionFullName: 'Chief Operating Officer',
    billTotal: 200000, discountPercent: 65,
    reason: 'Loyalty discount', note: 'COO limit is 50% here — 65% should be flagged out of authority with overage 30,000.',
    expectation: 'COO limit 50%, requested 65% => Out of Authority; overage = 130,000 - 100,000 = 30,000.',
    expected: { category: 'OR Packages', authority: 'Out', limit: 50, overage: 30000 },
  },
  {
    suffix: '04', patientName: 'Layla Hassan', patientId: 'P-10003', visitId: 'V-90004',
    serviceLevel: LEVEL.Inpatient, serviceCategory: CAT.Mortality, serviceName: 'Inpatient Mortality Case',
    hour: 22, positionFullName: 'VIP Program Manager',
    billTotal: 100000, discountPercent: 20,
    reason: 'VIP courtesy request', note: 'VIPM has no authority at all on Inpatient Mortality — should be Out of Authority with overage = full amount.',
    expectation: 'Matrix cell is "none" (hasAuthority=false, no limit%): overage = discount amount = 20,000.',
    expected: { category: 'Mortality', authority: 'Out', limit: null, overage: 20000 },
  },
  {
    suffix: '05', patientName: 'Sara Mostafa', patientId: 'P-10004', visitId: 'V-90005',
    serviceLevel: LEVEL.Outpatient, dotcareCategory: 'Medical Service', serviceName: 'Outpatient Consultation',
    hour: 22, positionFullName: undefined,
    billTotal: 50000, discountPercent: 8,
    reason: 'Unrecognized DotCare authorizer name', note: 'Employee name has no HR match, should default to PA position and Not-Restricted PA limit (10%).',
    expectation: 'Unmatched employee => default PA, wildcard PA limit 10%. 8% requested => Within Authority.',
    expected: { category: 'Consultation', authority: 'Within', limit: 10, overage: 0 },
  },
  {
    suffix: '06', patientName: 'Sara Mostafa', patientId: 'P-10004', visitId: 'V-90006',
    serviceLevel: LEVEL.Outpatient, dotcareCategory: 'Medical Service', serviceName: 'Outpatient Consultation (9AM-1PM)',
    hour: 10, positionFullName: undefined,
    billTotal: 50000, discountPercent: 24,
    reason: 'Unrecognized DotCare authorizer name', note: 'Same patient but during the 9AM-1PM block, where the PA limit is 30% instead of the 10% Not-Restricted default.',
    expectation: 'Tests the specific time-block tier beating the wildcard: PA @9-1 limit 30%, 24% requested => Within Authority.',
    expected: { category: 'Consultation', authority: 'Within', limit: 30, overage: 0 },
  },
  {
    suffix: '07', patientName: 'Ahmed Nabil', patientId: 'P-10005', visitId: 'V-90007',
    serviceLevel: LEVEL.ER, dotcareCategory: 'Medical Service', serviceName: 'ER Consultation',
    hour: 22, positionFullName: 'ER Manager',
    billTotal: 30000, discountPercent: 35,
    reason: 'ER discretionary discount', note: 'ER Manager limit is 30% for ER Consultation — 35% should be out of authority.',
    expectation: 'ER limit 30%, requested 35% => Out of Authority; overage = 10,500 - 9,000 = 1,500.',
    expected: { category: 'Consultation', authority: 'Out', limit: 30, overage: 1500 },
  },
  {
    suffix: '08', patientName: 'Nourhan Samir', patientId: 'P-10006', visitId: 'V-90008',
    serviceLevel: LEVEL.Outpatient, serviceCategory: CAT.HomeCare, serviceName: 'Outpatient Home Care Visit',
    hour: 22, positionFullName: 'Financial Manager',
    billTotal: 40000, discountPercent: 20,
    reason: 'Recurring home care patient', note: 'Financial Manager limit is 30% for Home Care — 20% should be within authority.',
    expectation: 'FM limit 30%, requested 20% => Within Authority.',
    expected: { category: 'Home Care', authority: 'Within', limit: 30, overage: 0 },
  },
  {
    suffix: '09', patientName: 'Youssef Adel', patientId: 'P-10007', visitId: 'V-90009',
    serviceLevel: LEVEL.Outpatient, serviceCategory: undefined, serviceName: 'Service Not Classified',
    hour: 22, positionFullName: 'Duty Manager',
    billTotal: 20000, discountPercent: 25,
    reason: 'Service could not be classified by DotCare', note: 'No service category at all — should be Out of Authority with no authorized limit shown.',
    expectation: 'unmatchedService = true (no dis_servicecategory) => Out of Authority, authorizedLimit/overage undefined.',
    expected: { category: null, authority: 'Out', limit: null, overage: null },
  },
  {
    suffix: '10', patientName: 'Rania Kamal', patientId: 'P-10008', visitId: 'V-90010',
    serviceLevel: LEVEL.Outpatient, dotcareCategory: 'Medication', serviceName: 'Outpatient Medications',
    hour: 22, positionFullName: 'Duty Manager',
    billTotal: 10000, discountPercent: 10,
    reason: 'Pharmacy discount request', note: 'Medications category has no authority for DUM (only CEO/COO do) — should be Out of Authority, overage = full amount.',
    expectation: 'DUM has no authority row for Medications: overage = discount amount = 1,000.',
    expected: { category: 'Medications', authority: 'Out', limit: null, overage: 1000 },
  },
  {
    suffix: '11', patientName: 'Omar Tarek', patientId: 'P-10009', visitId: 'V-90011',
    serviceLevel: LEVEL.Inpatient, serviceCategory: CAT.DAMA, serviceName: 'Inpatient DAMA Discharge',
    hour: 22, positionFullName: 'Inpatient Manager',
    billTotal: 60000, discountPercent: 25,
    reason: 'DAMA discharge courtesy', note: 'Inpatient Manager limit is 30% for DAMA — 25% should be within authority.',
    expectation: 'IM limit 30%, requested 25% => Within Authority.',
    expected: { category: 'DAMA', authority: 'Within', limit: 30, overage: 0 },
  },
  {
    suffix: '12', patientName: 'Heba Younes', patientId: 'P-10010', visitId: 'V-90012',
    serviceLevel: LEVEL.Outpatient, dotcareCategory: 'LAB Service', serviceName: 'Outpatient Lab Panel',
    hour: 18, positionFullName: 'Outpatient Manager',
    billTotal: 15000, discountPercent: 35,
    reason: 'Evening lab discount', note: 'Evening block (5-8PM) has no LAB row for OPD M at all — should fall back to no match and be Out of Authority.',
    expectation: 'Evening LAB rows only define values for CEO/COO — OPD M is "none": Out of Authority, overage = full amount.',
    expected: { category: 'Lab & Rad', authority: 'Out', limit: null, overage: 5250 },
  },
  // DotCare -> matrix category mapping coverage (see serviceCategoryMapping.ts).
  {
    suffix: '13', patientName: 'Tamer Hosny', patientId: 'P-10011', visitId: 'V-90013',
    serviceLevel: LEVEL.Outpatient, dotcareCategory: 'RADService', serviceName: 'Outpatient Chest X-Ray',
    hour: 10, positionFullName: undefined,
    billTotal: 8000, discountPercent: 15,
    reason: 'Morning radiology discount', note: 'RADService maps to Lab & Rad; unmatched authorizer defaults to PA, whose 9AM-1PM Lab & Rad limit is 20%.',
    expectation: 'RADService -> Lab & Rad, PA @9-1 limit 20%, 15% requested => Within Authority.',
    expected: { category: 'Lab & Rad', authority: 'Within', limit: 20, overage: 0 },
  },
  {
    suffix: '14', patientName: 'Dina Fawzy', patientId: 'P-10012', visitId: 'V-90014',
    serviceLevel: LEVEL.Outpatient, dotcareCategory: 'Microbiology', serviceName: 'Outpatient Culture & Sensitivity',
    hour: 22, positionFullName: 'Financial Manager',
    billTotal: 6000, discountPercent: 25,
    reason: 'Repeat lab patient', note: 'Microbiology maps to Lab & Rad; FM limit is 30%.',
    expectation: 'Microbiology -> Lab & Rad, FM limit 30%, 25% requested => Within Authority.',
    expected: { category: 'Lab & Rad', authority: 'Within', limit: 30, overage: 0 },
  },
  {
    suffix: '15', patientName: 'Hassan Ali', patientId: 'P-10013', visitId: 'V-90015',
    serviceLevel: LEVEL.Inpatient, dotcareCategory: 'Operations', serviceName: 'Inpatient Appendectomy',
    hour: 22, positionFullName: undefined,
    billTotal: 120000, discountPercent: 15,
    reason: 'Surgery cost assistance', note: 'Operations maps to OR Packages; unmatched authorizer defaults to PA, whose limit is 10%.',
    expectation: 'Operations -> OR Packages, PA limit 10%, 15% requested => Out of Authority; overage = 18,000 - 12,000 = 6,000.',
    expected: { category: 'OR Packages', authority: 'Out', limit: 10, overage: 6000 },
  },
  {
    suffix: '16', patientName: 'Mai Ezzat', patientId: 'P-10014', visitId: 'V-90016',
    serviceLevel: LEVEL.Outpatient, dotcareCategory: 'Medical Consumable', serviceName: 'Wound Care Supplies',
    hour: 22, positionFullName: 'Duty Manager',
    billTotal: 3000, discountPercent: 10,
    reason: 'Supplies discount', note: 'Medical Consumable has no matrix category — should show Unmatched Service.',
    expectation: 'Unmapped DotCare category => unmatchedService, Out of Authority, no authorized limit.',
    expected: { category: null, authority: 'Out', limit: null, overage: null },
  },
  {
    suffix: '17', patientName: 'Sherif Magdy', patientId: 'P-10015', visitId: 'V-90017',
    serviceLevel: LEVEL.ER, dotcareCategory: 'Procedure', serviceName: 'ER Suturing',
    hour: 22, positionFullName: 'ER Manager',
    billTotal: 5000, discountPercent: 20,
    reason: 'ER procedure discount', note: 'Procedure maps to Procedures, which has no matrix rows yet — no rule applies.',
    expectation: 'Procedure -> Procedures, no matching matrix row => Out of Authority, no authorized limit.',
    expected: { category: 'Procedures', authority: 'Out', limit: null, overage: null },
  },
];


/**
 * The dis_discountrequest record a scenario seeds, as DotCare would send it. Authorized By is a
 * real system user holding the scenario's position (or free text when none exists / none is
 * wanted); the agent is any user, round-robin, in DotCare's "<code>-<name>" form.
 */
export function buildRequestRecord(scenario: RequestSeed, index: number, systemUsers: SystemUserLite[]) {
  const user = scenario.positionFullName ? userForPosition(systemUsers, scenario.positionFullName) : undefined;
  const fallbackLabel = scenario.positionFullName ? `Unmatched-${scenario.positionFullName}` : 'Unknown Authorizer';
  const agentUser = systemUsers.length > 0 ? systemUsers[index % systemUsers.length] : undefined;

  return {
    dis_name: `Seed Request ${scenario.suffix} - ${scenario.serviceName}`,
    dis_patientname: scenario.patientName,
    dis_patientid: scenario.patientId,
    dis_visitid: scenario.visitId,
    dis_servicelevel: scenario.serviceLevel,
    dis_servicecategorydotcare: scenario.dotcareCategory,
    dis_servicecategory: scenario.serviceCategory != null ? [scenario.serviceCategory] : undefined,
    dis_servicename: scenario.serviceName,
    dis_actualcreatedon: atHour(scenario.hour),
    dis_authorizedbynamedotcare: authorizedByText(user, fallbackLabel),
    dis_agentdotcare: agentUser?.fullname ? `${1000 + index}-${agentUser.fullname}` : 'Unknown Agent',
    dis_billtotal: scenario.billTotal,
    dis_totaldiscountpercent: scenario.discountPercent,
    dis_totaldiscountamount: Math.round((scenario.billTotal * scenario.discountPercent) / 100),
    dis_reason: scenario.reason,
    dis_note: `${scenario.note} (${scenario.expectation})`,
    statecode: 0 as const,
  };
}
