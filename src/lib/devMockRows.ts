import type { Dis_discountrequests } from '../generated/models/Dis_discountrequestsModel';
import type { RequestRowViewModel } from './rowViewModel';
import { AUTHORITY_OUT, AUTHORITY_WITHIN, REQUEST_APPROVED, REQUEST_REJECTED } from './optionSets';

/** Dev-only: `?mock` in the URL renders these placeholder rows instead of calling Dataverse, so the
 * screen can be styled with `npm run dev` outside the Power Apps host. Never used in a build. */
export function isMockMode(): boolean {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).has('mock');
}

interface MockSeed {
  patient: string;
  category: string;
  service: string;
  level: string;
  block: string;
  pct: number;
  bill: number;
  limit?: number;
  authorizedBy: string;
  agent: string;
  reason: string;
  status?: number;
  outOfAuthority?: boolean;
  unmatchedService?: boolean;
  unmatchedEmployee?: boolean;
  locked?: boolean;
  mine?: boolean;
}

const SEEDS: MockSeed[] = [
  { patient: 'Ahmed Hassan', category: 'Procedures', service: 'Laparoscopic Cholecystectomy', level: 'Inpatient', block: 'Day', pct: 25, bill: 48500, limit: 15, authorizedBy: 'Mohamed Saeed (FM)', agent: 'Sara Ali', reason: 'Employee relative', outOfAuthority: true, mine: true },
  { patient: 'Fatma Ibrahim', category: 'Lab & Rad', service: 'MRI Brain with Contrast', level: 'Outpatient', block: 'Day', pct: 10, bill: 6200, limit: 15, authorizedBy: 'Omar Khaled (PA)', agent: 'Nour Adel', reason: 'Loyalty patient' },
  { patient: 'Youssef Mahmoud', category: 'Lab & Rad', service: 'Complete Blood Count', level: 'ER', block: 'Night', pct: 50, bill: 450, limit: 20, authorizedBy: 'Hany Fathy (SV)', agent: 'Mona Samir', reason: 'Financial hardship', outOfAuthority: true },
  { patient: 'Mariam Adel', category: 'OR Packages', service: 'Normal Delivery Package', level: 'Inpatient', block: 'Day', pct: 5, bill: 32000, limit: 10, authorizedBy: 'Omar Khaled (PA)', agent: 'Sara Ali', reason: 'Corporate goodwill', status: REQUEST_REJECTED, locked: true },
  { patient: 'Khaled Mostafa', category: '', service: 'Physio Session x10', level: 'Outpatient', block: 'Evening', pct: 15, bill: 4800, authorizedBy: 'Dr. Tarek', agent: 'Nour Adel', reason: 'Doctor request', unmatchedService: true, unmatchedEmployee: true },
  { patient: 'Hoda Salah', category: 'Dental without Prosthesis', service: 'Root Canal Treatment', level: 'Outpatient', block: 'Day', pct: 30, bill: 7500, limit: 20, authorizedBy: 'Mohamed Saeed (FM)', agent: 'Mona Samir', reason: 'Staff family', outOfAuthority: true, mine: true },
  { patient: 'Mahmoud Reda', category: 'Medications', service: 'Oncology Protocol Cycle 3', level: 'Inpatient', block: 'Night', pct: 12, bill: 91000, limit: 15, authorizedBy: 'Rania Fouad (MD)', agent: 'Sara Ali', reason: 'Long-term patient', locked: true },
  { patient: 'Salma Nabil', category: 'Home Care', service: 'Nursing Visit', level: 'Outpatient', block: 'Evening', pct: 8, bill: 1200, limit: 10, authorizedBy: 'Omar Khaled (PA)', agent: 'Nour Adel', reason: 'Repeat visits' },
  { patient: 'Amr Gamal', category: 'Procedures', service: 'Knee Arthroscopy', level: 'Inpatient', block: 'Day', pct: 20, bill: 56000, limit: 15, authorizedBy: 'Hany Fathy (SV)', agent: 'Mona Samir', reason: 'Insurance gap', outOfAuthority: true },
  { patient: 'Nadia Farouk', category: 'Lab & Rad', service: 'CT Abdomen', level: 'ER', block: 'Night', pct: 5, bill: 3900, limit: 15, authorizedBy: 'Rania Fouad (MD)', agent: 'Sara Ali', reason: 'Elderly patient' },
];

export function buildMockRows(): RequestRowViewModel[] {
  return SEEDS.map((s, i) => {
    const amount = Math.round((s.bill * s.pct) / 100);
    const overage = s.outOfAuthority && s.limit != null ? Math.round((s.bill * (s.pct - s.limit)) / 100) : undefined;
    const created = new Date();
    created.setHours(8 + i, (i * 17) % 60, 0, 0);
    return {
      id: `mock-${i}`,
      request: { dis_discountrequestid: `mock-${i}`, dis_name: `DR-${String(1040 + i)}` } as Dis_discountrequests,
      evaluation: {
        authorizedByPosition: 0,
        authorizedLimit: s.limit,
        overageAboveAuthority: overage,
        authorityCheck: s.outOfAuthority ? AUTHORITY_OUT : AUTHORITY_WITHIN,
        unmatchedEmployee: !!s.unmatchedEmployee,
        ambiguousEmployee: false,
        unmatchedService: !!s.unmatchedService,
        unmatchedAgent: false,
        ambiguousAgent: false,
      },
      patientName: s.patient,
      patientId: `P-${204310 + i * 37}`,
      visitId: `V-${88120 + i * 11}`,
      serviceCategory: s.category,
      serviceName: s.service,
      serviceLevel: s.level,
      timeBlock: s.block,
      totalDiscountPercent: s.pct,
      totalDiscountAmount: amount,
      billTotal: s.bill,
      authorizedLimit: s.limit,
      overageAboveAuthority: overage,
      isOutOfAuthority: !!s.outOfAuthority,
      authorizedByDisplay: s.authorizedBy,
      agentName: s.agent,
      reason: s.reason,
      note: i % 3 === 0 ? 'Follow-up with finance' : '',
      requestStatus: s.status ?? REQUEST_APPROVED,
      actualCreatedOn: created.toISOString(),
      decisionLocked: !!s.locked,
      decisionComment: s.locked && s.status === REQUEST_REJECTED ? 'Discount exceeds package policy; patient not eligible.' : '',
      decidedByName: s.locked ? 'Rania Fouad' : '',
      decidedByRole: s.locked ? 'MD' : '',
      decisionDate: s.locked ? created.toISOString() : '',
      isOutOfYourAuthority: !!s.mine,
    };
  });
}
