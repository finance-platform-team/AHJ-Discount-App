import { Dis_discountrequestsService } from '../generated/services/Dis_discountrequestsService';
import { fetchSystemUsers } from './dataSync';
import { derivePositionFromTitle } from './positionDerivation';
import { POSITION_ENTRIES } from './optionSets';
import type { SystemUserLite } from './types';

// Same global choice codes used by seedMatrixData.ts / the generated model — the single source
// of truth for these numeric values lives in Dis_discountrequestsModel.ts.
const LEVEL = {
  Inpatient: 776940000,
  Outpatient: 776940001,
  ER: 776940002,
} as const;

const CAT = {
  Packages: 776940000,
  RADService: 776940001,
  LABService: 776940002,
  Procedure: 776940003,
  Dental: 776940004,
  HomeCare: 776940005,
  Mortality: 776940006,
  DAMA: 776940007,
  Medications: 776940008,
} as const;

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

interface RequestSeed {
  suffix: string;
  patientName: string;
  patientId: string;
  visitId: string;
  serviceLevel?: (typeof LEVEL)[keyof typeof LEVEL];
  serviceCategory?: (typeof CAT)[keyof typeof CAT];
  serviceName: string;
  hour: number; // local hour used to derive the time block
  positionFullName?: string; // undefined => deliberately unmatched employee
  billTotal: number;
  discountPercent: number;
  reason: string;
  note: string;
  expectation: string; // documents what this row is meant to prove, shown nowhere but here
}

const SCENARIOS: RequestSeed[] = [
  {
    suffix: '01', patientName: 'Mona Adel', patientId: 'P-10001', visitId: 'V-90001',
    serviceLevel: LEVEL.Inpatient, serviceCategory: CAT.Mortality, serviceName: 'Inpatient Mortality Case',
    hour: 22, positionFullName: 'Chief Executive Officer',
    billTotal: 500000, discountPercent: 70,
    reason: 'Deceased patient family hardship', note: 'CEO unlimited authority — should always read Within Authority.',
    expectation: 'CEO row is unlimited (inf): authorityCheck = Within regardless of % requested.',
  },
  {
    suffix: '02', patientName: 'Karim Fathy', patientId: 'P-10002', visitId: 'V-90002',
    serviceLevel: LEVEL.Inpatient, serviceCategory: CAT.Packages, serviceName: 'Inpatient OR Package - Knee Surgery',
    hour: 22, positionFullName: 'Chief Operating Officer',
    billTotal: 200000, discountPercent: 45,
    reason: 'Loyalty discount', note: 'COO limit is 50% here — 45% should stay within authority.',
    expectation: 'COO limit 50%, requested 45% => Within Authority, overage 0.',
  },
  {
    suffix: '03', patientName: 'Karim Fathy', patientId: 'P-10002', visitId: 'V-90003',
    serviceLevel: LEVEL.Inpatient, serviceCategory: CAT.Packages, serviceName: 'Inpatient OR Package - Hip Surgery',
    hour: 22, positionFullName: 'Chief Operating Officer',
    billTotal: 200000, discountPercent: 65,
    reason: 'Loyalty discount', note: 'COO limit is 50% here — 65% should be flagged out of authority with overage 30,000.',
    expectation: 'COO limit 50%, requested 65% => Out of Authority; overage = 130,000 - 100,000 = 30,000.',
  },
  {
    suffix: '04', patientName: 'Layla Hassan', patientId: 'P-10003', visitId: 'V-90004',
    serviceLevel: LEVEL.Inpatient, serviceCategory: CAT.Mortality, serviceName: 'Inpatient Mortality Case',
    hour: 22, positionFullName: 'VIP Program Manager',
    billTotal: 100000, discountPercent: 20,
    reason: 'VIP courtesy request', note: 'VIPM has no authority at all on Inpatient Mortality — should be Out of Authority with overage = full amount.',
    expectation: 'Matrix cell is "none" (hasAuthority=false, no limit%): overage = discount amount = 20,000.',
  },
  {
    suffix: '05', patientName: 'Sara Mostafa', patientId: 'P-10004', visitId: 'V-90005',
    serviceLevel: LEVEL.Outpatient, serviceCategory: CAT.Procedure, serviceName: 'Outpatient Consultation',
    hour: 22, positionFullName: undefined,
    billTotal: 50000, discountPercent: 8,
    reason: 'Unrecognized DotCare authorizer name', note: 'Employee name has no HR match, should default to PA position and Not-Restricted PA limit (10%).',
    expectation: 'Unmatched employee => default PA, wildcard PA limit 10%. 8% requested => Within Authority.',
  },
  {
    suffix: '06', patientName: 'Sara Mostafa', patientId: 'P-10004', visitId: 'V-90006',
    serviceLevel: LEVEL.Outpatient, serviceCategory: CAT.Procedure, serviceName: 'Outpatient Consultation (9AM-1PM)',
    hour: 10, positionFullName: undefined,
    billTotal: 50000, discountPercent: 24,
    reason: 'Unrecognized DotCare authorizer name', note: 'Same patient but during the 9AM-1PM block, where the PA limit is 30% instead of the 10% Not-Restricted default.',
    expectation: 'Tests the specific time-block tier beating the wildcard: PA @9-1 limit 30%, 24% requested => Within Authority.',
  },
  {
    suffix: '07', patientName: 'Ahmed Nabil', patientId: 'P-10005', visitId: 'V-90007',
    serviceLevel: LEVEL.ER, serviceCategory: CAT.Procedure, serviceName: 'ER Consultation',
    hour: 22, positionFullName: 'ER Manager',
    billTotal: 30000, discountPercent: 35,
    reason: 'ER discretionary discount', note: 'ER Manager limit is 30% for ER Consultation — 35% should be out of authority.',
    expectation: 'ER limit 30%, requested 35% => Out of Authority; overage = 10,500 - 9,000 = 1,500.',
  },
  {
    suffix: '08', patientName: 'Nourhan Samir', patientId: 'P-10006', visitId: 'V-90008',
    serviceLevel: LEVEL.Outpatient, serviceCategory: CAT.HomeCare, serviceName: 'Outpatient Home Care Visit',
    hour: 22, positionFullName: 'Financial Manager',
    billTotal: 40000, discountPercent: 20,
    reason: 'Recurring home care patient', note: 'Financial Manager limit is 30% for Home Care — 20% should be within authority.',
    expectation: 'FM limit 30%, requested 20% => Within Authority.',
  },
  {
    suffix: '09', patientName: 'Youssef Adel', patientId: 'P-10007', visitId: 'V-90009',
    serviceLevel: LEVEL.Outpatient, serviceCategory: undefined, serviceName: 'Service Not Classified',
    hour: 22, positionFullName: 'Duty Manager',
    billTotal: 20000, discountPercent: 25,
    reason: 'Service could not be classified by DotCare', note: 'No service category at all — should be Out of Authority with no authorized limit shown.',
    expectation: 'unmatchedService = true (no dis_servicecategory) => Out of Authority, authorizedLimit/overage undefined.',
  },
  {
    suffix: '10', patientName: 'Rania Kamal', patientId: 'P-10008', visitId: 'V-90010',
    serviceLevel: LEVEL.Outpatient, serviceCategory: CAT.Medications, serviceName: 'Outpatient Medications',
    hour: 22, positionFullName: 'Duty Manager',
    billTotal: 10000, discountPercent: 10,
    reason: 'Pharmacy discount request', note: 'Medications category has no authority for DUM (only CEO/COO do) — should be Out of Authority, overage = full amount.',
    expectation: 'DUM has no authority row for Medications: overage = discount amount = 1,000.',
  },
  {
    suffix: '11', patientName: 'Omar Tarek', patientId: 'P-10009', visitId: 'V-90011',
    serviceLevel: LEVEL.Inpatient, serviceCategory: CAT.DAMA, serviceName: 'Inpatient DAMA Discharge',
    hour: 22, positionFullName: 'Inpatient Manager',
    billTotal: 60000, discountPercent: 25,
    reason: 'DAMA discharge courtesy', note: 'Inpatient Manager limit is 30% for DAMA — 25% should be within authority.',
    expectation: 'IM limit 30%, requested 25% => Within Authority.',
  },
  {
    suffix: '12', patientName: 'Heba Younes', patientId: 'P-10010', visitId: 'V-90012',
    serviceLevel: LEVEL.Outpatient, serviceCategory: CAT.LABService, serviceName: 'Outpatient Lab Panel',
    hour: 18, positionFullName: 'Outpatient Manager',
    billTotal: 15000, discountPercent: 35,
    reason: 'Evening lab discount', note: 'Evening block (5-8PM) has no LAB row for OPD M at all — should fall back to no match and be Out of Authority.',
    expectation: 'Evening LAB rows only define values for CEO/COO — OPD M is "none": Out of Authority, overage = full amount.',
  },
];

export interface RequestSeedProgress {
  total: number;
  done: number;
  failed: { name: string; error: string }[];
}

export async function seedDiscountRequests(
  onProgress?: (p: RequestSeedProgress) => void
): Promise<RequestSeedProgress> {
  const systemUsers = await fetchSystemUsers();
  const progress: RequestSeedProgress = { total: SCENARIOS.length, done: 0, failed: [] };

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    const user = scenario.positionFullName ? userForPosition(systemUsers, scenario.positionFullName) : undefined;
    const fallbackLabel = scenario.positionFullName ? `Unmatched-${scenario.positionFullName}` : 'Unknown Authorizer';
    // The agent (who entered the request) is unrelated to authority — any real systemuser will do,
    // picked round-robin, in plain "<code>-<name>" DotCare form to exercise that resolution path too.
    const agentUser = systemUsers.length > 0 ? systemUsers[i % systemUsers.length] : undefined;
    const agentDotcareText = agentUser?.fullname ? `${1000 + i}-${agentUser.fullname}` : 'Unknown Agent';
    const totalDiscountAmount = Math.round((scenario.billTotal * scenario.discountPercent) / 100);
    const name = `Seed Request ${scenario.suffix} - ${scenario.serviceName}`;

    try {
      await Dis_discountrequestsService.create({
        dis_name: name,
        dis_patientname: scenario.patientName,
        dis_patientid: scenario.patientId,
        dis_visitid: scenario.visitId,
        dis_servicelevel: scenario.serviceLevel,
        dis_servicecategory: scenario.serviceCategory != null ? [scenario.serviceCategory] : undefined,
        dis_servicename: scenario.serviceName,
        dis_actualcreatedon: atHour(scenario.hour),
        dis_authorizedbynamedotcare: authorizedByText(user, fallbackLabel),
        dis_agentdotcare: agentDotcareText,
        dis_billtotal: scenario.billTotal,
        dis_totaldiscountpercent: scenario.discountPercent,
        dis_totaldiscountamount: totalDiscountAmount,
        dis_reason: scenario.reason,
        dis_note: `${scenario.note} (${scenario.expectation})`,
        statecode: 0,
      });
    } catch (err) {
      progress.failed.push({ name, error: err instanceof Error ? err.message : String(err) });
    }
    progress.done++;
    onProgress?.({ ...progress });
  }

  return progress;
}
