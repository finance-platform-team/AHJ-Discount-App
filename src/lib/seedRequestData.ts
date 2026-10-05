import { Dis_discountrequestsService } from '../generated/services/Dis_discountrequestsService';
import type { Dis_discountrequestsBase } from '../generated/models/Dis_discountrequestsModel';
import { fetchRequests, fetchSystemUsers } from './dataSync';
import type { SeedProgress } from './seedMatrixData';
import type { CurrentUser } from './currentUser';
import { derivePositionFromTitle } from './positionDerivation';
import { resolveClosestUser } from './userResolution';
import { codeByLabel, POSITION_ENTRIES, REQUEST_APPROVED, REQUEST_REJECTED, SERVICE_LEVEL } from './optionSets';
import { collapseWhitespace } from './textUtils';
import type { SystemUserLite } from './types';

/*
 * Manual-test seed: 10 discount requests, each targeting a key behaviour of the system (category
 * mapping, time blocks, limits, unmatched names, your own authority, locked decisions). Every
 * request's dis_reason names the case and its dis_note states the expected result, so a tester can
 * compare the grid/review dialog against it. Expectations assume the matrix from seedMatrixData.ts.
 */

const LEVEL = {
  Inpatient: codeByLabel(SERVICE_LEVEL, 'Inpatient'),
  Outpatient: codeByLabel(SERVICE_LEVEL, 'Outpatient'),
  ER: codeByLabel(SERVICE_LEVEL, 'ER'),
};

type PositionAbbr = 'CEO' | 'COO' | 'ROM' | 'OM' | 'MD' | 'VIPM' | 'ER' | 'OPD M' | 'IM' | 'DUM' | 'FM' | 'PA';

/** Spelling variants DotCare may send for the same person. */
type NameVariant = 'exact' | 'honorific' | 'codePrefix' | 'reversed' | 'messy' | 'firstLast' | 'ambiguous';

/** Who DotCare says authorized the discount. */
type AuthorizedBySpec =
  | { position: PositionAbbr } // a real system user whose title derives to this position
  | { variant: NameVariant } // a spelling variant of one real user's name
  | { text: string } // free text, deliberately matching nobody
  | { currentUser: true }; // the signed-in tester

type AgentSpec = 'matched' | 'unmatched' | 'ambiguous' | 'empty';

/** Expected evaluation: limit is a %, 'inf' (unlimited), 'none' (matrix cell "–") or 'no-rule'. */
export interface Expected {
  category: string | null; // null => Unmatched Service
  limit?: number | 'inf' | 'none' | 'no-rule'; // omitted when it depends on a real user's position
  within?: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  level?: number | null; // default Outpatient; null => no service level
  dotcare?: string; // default 'Medical Service' (-> Consultation)
  at?: [hour: number, minute: number] | null; // default 22:00 (outside all time blocks); null => no time
  authorizedBy: AuthorizedBySpec;
  agent?: AgentSpec; // default 'matched'
  bill?: number; // default 10,000
  pct: number;
  amount?: number; // default bill × pct; set to simulate an inconsistent DotCare amount
  decision?: 'approved' | 'rejected'; // creates the request already decided and locked
  expect: Expected;
  why?: string;
}

const UNMATCHED_NAME = 'Unregistered Authorizer Qx';
const PA = (within: boolean, limit: Expected['limit'] = 10): Expected => ({ category: 'Consultation', limit, within });

export const SCENARIOS: Scenario[] = [
  { id: '01', title: 'Mapping + morning block · within', at: [10, 0], dotcare: 'Medical Service', authorizedBy: { position: 'PA' }, pct: 25, expect: PA(true, 30), why: 'Medical Service → Consultation; the 9AM–1PM PA limit (30%) beats the 10% default.' },
  { id: '02', title: 'Mapping + morning block · over', at: [10, 0], dotcare: 'RADService', authorizedBy: { position: 'PA' }, pct: 25, expect: { category: 'Lab & Rad', limit: 20, within: false }, why: 'RADService → Lab & Rad; 9AM–1PM PA limit is 20%.' },
  { id: '03', title: 'Unmapped DotCare category', dotcare: 'Medical Consumable', authorizedBy: { position: 'COO' }, pct: 20, expect: { category: null, within: false } },
  { id: '04', title: 'No matrix rule', dotcare: 'Procedure', authorizedBy: { position: 'COO' }, pct: 20, expect: { category: 'Procedures', limit: 'no-rule', within: false }, why: 'Procedures has no rows in the matrix.' },
  { id: '05', title: 'CEO unlimited', level: LEVEL.Inpatient, dotcare: 'Packages', authorizedBy: { position: 'CEO' }, pct: 95, expect: { category: 'OR Packages', limit: 'inf', within: true } },
  { id: '06', title: 'Exactly at limit', authorizedBy: { position: 'FM' }, pct: 30, expect: { category: 'Consultation', limit: 30, within: true } },
  { id: '07', title: 'Over limit · large bill', authorizedBy: { position: 'DUM' }, bill: 2_500_000, pct: 20, expect: { category: 'Consultation', limit: 15, within: false }, why: 'Overage = 500,000 − 375,000 = 125,000.' },
  { id: '08', title: 'Unknown authorizer & agent', authorizedBy: { text: UNMATCHED_NAME }, agent: 'unmatched', pct: 5, expect: PA(true), why: 'Unmatched Employee badge, defaults to PA; the Review dialog also flags the unknown agent.' },
  { id: '09', title: 'You · over your limit', authorizedBy: { currentUser: true }, pct: 99, expect: { category: 'Consultation' }, why: 'Counts in "Out of Your Authority" unless your title derives to CEO.' },
  { id: '10', title: 'Locked · rejected with comment', authorizedBy: { position: 'FM' }, pct: 45, decision: 'rejected', expect: { category: 'Consultation', limit: 30, within: false }, why: 'Opens read-only with the decision comment and Decided By.' },
];

const PATIENTS = [
  'Ahmed Hassan', 'Fatma Ibrahim', 'Youssef Mahmoud', 'Mariam Adel', 'Khaled Mostafa', 'Hoda Salah', 'Mahmoud Reda',
  'Salma Nabil', 'Amr Gamal', 'Nadia Farouk', 'Omar Tarek', 'Laila Sami', 'Karim Fathy', 'Dina Fawzy', 'Hassan Ali',
];

/** Today at a local hour:minute, so the derived time block is predictable in this browser. */
function atTime(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function expectationText({ category, limit, within }: Expected): string {
  if (category == null) return 'Unmatched Service · Out of Authority · no limit';
  const parts = [category];
  if (limit === 'no-rule') parts.push('no matrix rule · no limit');
  else if (limit === 'inf') parts.push('limit ∞');
  else if (limit === 'none') parts.push('no authority (–)');
  else if (limit != null) parts.push(`limit ${limit}%`);
  if (within != null) parts.push(within ? 'Within Authority' : 'Out of Authority');
  return parts.join(' · ');
}

/** Real system users the scenarios rely on, resolved once per seed run. */
interface SeedPeople {
  byPosition: Map<PositionAbbr, SystemUserLite>;
  sample?: SystemUserLite;
  ambiguousToken?: string;
}

/** True when DotCare text `raw` resolves to exactly `user`. */
const resolvesTo = (raw: string, user: SystemUserLite, users: SystemUserLite[]) =>
  resolveClosestUser(raw, users).user?.systemuserid === user.systemuserid;

const firstAndLast = (name: string) => {
  const tokens = collapseWhitespace(name).split(' ');
  return `${tokens[0]} ${tokens[tokens.length - 1]}`;
};

function findPeople(users: SystemUserLite[]): SeedPeople {
  // Only users whose own full name resolves back to them can stand in for a position reliably.
  const selfResolving = users.filter(
    (u) => collapseWhitespace(u.fullname).includes(' ') && resolvesTo(u.fullname!, u, users)
  );

  const byPosition = new Map<PositionAbbr, SystemUserLite>();
  for (const entry of POSITION_ENTRIES) {
    const user = selfResolving.find((u) => derivePositionFromTitle(u.title) === entry.code);
    if (user) byPosition.set(entry.abbr as PositionAbbr, user);
  }

  // Prefer someone whose first + last name alone still resolves uniquely, so every variant is fair.
  const sample = selfResolving.find((u) => resolvesTo(firstAndLast(u.fullname!), u, users)) ?? selfResolving[0];

  const tokens = new Set(users.flatMap((u) => collapseWhitespace(u.fullname).split(' ')).filter((t) => t.length >= 3));
  const ambiguousToken = [...tokens].find((t) => resolveClosestUser(t, users).status === 'ambiguous');

  return { byPosition, sample, ambiguousToken };
}

function nameVariant(name: string, variant: Exclude<NameVariant, 'ambiguous'>): string {
  const tokens = collapseWhitespace(name).split(' ');
  switch (variant) {
    case 'exact': return name;
    case 'honorific': return `Dr. ${name}`;
    case 'codePrefix': return `2819-Mr. ${name}`;
    case 'reversed': return [...tokens].reverse().join(' ');
    case 'messy': return `  ${tokens.join('   ').toUpperCase()}  `;
    case 'firstLast': return firstAndLast(name);
  }
}

/** DotCare Authorized By text for a scenario, plus who it should resolve to and any caveat. */
function authorizedByText(
  spec: AuthorizedBySpec,
  people: SeedPeople,
  currentUser: CurrentUser | null
): { text: string; intended?: string; warning?: string } {
  if ('text' in spec) return { text: spec.text };
  if ('currentUser' in spec) {
    return currentUser?.fullName
      ? { text: currentUser.fullName, intended: `${currentUser.fullName} (you)` }
      : { text: UNMATCHED_NAME, warning: 'Signed-in user unknown — evaluates as an unmatched PA instead.' };
  }
  if ('position' in spec) {
    const user = people.byPosition.get(spec.position);
    if (user) return { text: `Mr. ${user.fullname}`, intended: `${user.fullname} (${spec.position})` };
    return {
      text: `${UNMATCHED_NAME} ${spec.position}`,
      warning: `No system user's title derives to ${spec.position}, so this evaluates as an unmatched PA and the expectation does not hold.`,
    };
  }
  if (spec.variant === 'ambiguous') {
    return people.ambiguousToken
      ? { text: people.ambiguousToken, intended: `nobody — "${people.ambiguousToken}" matches several users` }
      : { text: UNMATCHED_NAME, warning: 'No name token is shared by several users — evaluates as unmatched instead.' };
  }
  if (!people.sample?.fullname) return { text: UNMATCHED_NAME, warning: 'No system users found.' };
  return { text: nameVariant(people.sample.fullname, spec.variant), intended: people.sample.fullname };
}

function agentText(spec: AgentSpec, people: SeedPeople, index: number): string {
  const code = 1000 + index;
  switch (spec) {
    case 'matched': return people.sample?.fullname ? `${code}-${people.sample.fullname}` : '';
    case 'unmatched': return `${code}-Unknown Agent Zq`;
    case 'ambiguous': return people.ambiguousToken ? `${code}-${people.ambiguousToken}` : '';
    case 'empty': return '';
  }
}

type RequestRecord = Omit<Dis_discountrequestsBase, 'dis_discountrequestid'>;

/** Builds every seed request as plain data (no Dataverse calls). */
export function buildRequestRecords(users: SystemUserLite[], currentUser: CurrentUser | null): RequestRecord[] {
  const people = findPeople(users);
  const deciderId = currentUser?.systemUserId ?? people.sample?.systemuserid;

  return SCENARIOS.map((s, i) => {
    const bill = s.bill ?? 10_000;
    const authorizer = authorizedByText(s.authorizedBy, people, currentUser);
    const at = s.at === undefined ? ([22, 0] as const) : s.at;
    const level = s.level === undefined ? LEVEL.Outpatient : (s.level ?? undefined);

    const note = [
      `Expected: ${expectationText(s.expect)}.`,
      s.why,
      authorizer.intended && `Authorized By should resolve to: ${authorizer.intended}.`,
      authorizer.warning && `⚠ ${authorizer.warning}`,
    ]
      .filter(Boolean)
      .join(' ');

    const record: RequestRecord = {
      dis_name: `TC-${s.id} · ${s.title}`,
      dis_patientname: PATIENTS[i % PATIENTS.length],
      dis_patientid: `P-${20001 + i}`,
      dis_visitid: `V-${70001 + i}`,
      dis_servicelevel: level as RequestRecord['dis_servicelevel'],
      dis_servicecategorydotcare: s.dotcare ?? 'Medical Service',
      dis_servicename: s.title.split(' · ')[1] ?? s.title,
      dis_actualcreatedon: at ? atTime(at[0], at[1]) : undefined,
      dis_authorizedbynamedotcare: authorizer.text,
      dis_agentdotcare: agentText(s.agent ?? 'matched', people, i),
      dis_billtotal: bill,
      dis_totaldiscountpercent: s.pct,
      dis_totaldiscountamount: s.amount ?? Math.round((bill * s.pct) / 100),
      dis_reason: `TC-${s.id}: ${s.title}`,
      dis_note: note,
      dis_requeststatus: s.decision === 'rejected' ? REQUEST_REJECTED : REQUEST_APPROVED,
      statecode: 0,
    };

    if (s.decision) {
      record.dis_decisionlocked = true;
      record.dis_decisiondate = new Date().toISOString();
      if (s.decision === 'rejected') {
        record.dis_decisioncomment = 'Exceeds FM authority; patient not eligible for this discount.';
      }
      if (deciderId) record['dis_DecidedBy@odata.bind'] = `/systemusers(${deciderId})`;
    }
    return record;
  });
}

/** Dev tooling: creates every manual-test request (see the scenario table above). */
export async function seedDiscountRequests(
  onProgress: ((p: SeedProgress) => void) | undefined,
  currentUser: CurrentUser | null
): Promise<SeedProgress> {
  const records = buildRequestRecords(await fetchSystemUsers(), currentUser);
  const progress: SeedProgress = { total: records.length, done: 0, failed: [] };

  for (const record of records) {
    try {
      await Dis_discountrequestsService.create(record);
    } catch (err) {
      progress.failed.push({ name: record.dis_name, error: err instanceof Error ? err.message : String(err) });
    }
    progress.done++;
    onProgress?.({ ...progress });
  }

  return progress;
}

/** Dev tooling: permanently deletes every discount request record, reporting progress per record. */
export async function deleteAllDiscountRequests(onProgress?: (p: SeedProgress) => void): Promise<SeedProgress> {
  const requests = await fetchRequests();
  const progress: SeedProgress = { total: requests.length, done: 0, failed: [] };
  onProgress?.({ ...progress });

  for (const request of requests) {
    try {
      await Dis_discountrequestsService.delete(request.dis_discountrequestid);
    } catch (err) {
      progress.failed.push({ name: request.dis_name, error: err instanceof Error ? err.message : String(err) });
    }
    progress.done++;
    onProgress?.({ ...progress });
  }

  return progress;
}
