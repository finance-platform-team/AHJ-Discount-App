import { Dis_discountlimitmatrixesService } from '../generated/services/Dis_discountlimitmatrixesService';
import {
  SERVICE_LEVEL,
  SERVICE_CATEGORY,
  TIME_BLOCK,
  POSITION_ENTRIES,
  type PositionCode,
} from './optionSets';

// Position column order matches the source policy table (CEO..PA).
const POSITION_ORDER: PositionCode[] = POSITION_ENTRIES.map((p) => p.code);

type Cell = 'inf' | 'none' | number;

interface MatrixGroup {
  level: keyof typeof SERVICE_LEVEL;
  timeblock: keyof typeof TIME_BLOCK;
  category: keyof typeof SERVICE_CATEGORY;
  label: string;
  // Values in POSITION_ORDER order: CEO, COO, ROM, OM, MD, VIPM, ER, OPD M, IM, DUM, FM, PA
  values: Cell[];
}

const LEVEL = {
  Inpatient: 776940000,
  Outpatient: 776940001,
  ER: 776940002,
} as const;

const BLOCK = {
  NotRestricted: 776940000,
  Morning: 776940001, // 09:00 AM-1:00 PM
  Afternoon: 776940002, // 1:00 PM-5:00 PM
  Evening: 776940003, // 5:00 PM-8:00 PM
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

// Outpatient's block-time phase rows are folded into the Outpatient service level
// (per user request), differentiated only by dis_timeblock.
// "Consultation" -> Procedure, "Lab & Rad" -> split into RADService + LAB Service
// (duplicated values), both confirmed with the user.
const GROUPS: MatrixGroup[] = [
  { level: LEVEL.Inpatient, timeblock: BLOCK.NotRestricted, category: CAT.Mortality, label: 'Inpatient Mortality',
    values: ['inf', 50, 40, 30, 30, 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },
  { level: LEVEL.Inpatient, timeblock: BLOCK.NotRestricted, category: CAT.Packages, label: 'Inpatient OR Packages',
    values: ['inf', 50, 35, 25, 25, 30, 'none', 'none', 'none', 25, 25, 10] },
  { level: LEVEL.Inpatient, timeblock: BLOCK.NotRestricted, category: CAT.DAMA, label: 'Inpatient DAMA',
    values: ['inf', 50, 40, 30, 30, 'none', 'none', 'none', 30, 30, 'none', 'none'] },

  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.Procedure, label: 'Outpatient Consultation',
    values: ['inf', 50, 40, 30, 30, 30, 'none', 30, 'none', 15, 30, 10] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.RADService, label: 'Outpatient Lab & Rad (RAD)',
    values: ['inf', 50, 40, 30, 30, 30, 'none', 30, 'none', 15, 30, 10] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.LABService, label: 'Outpatient Lab & Rad (LAB)',
    values: ['inf', 50, 40, 30, 30, 30, 'none', 30, 'none', 15, 30, 10] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.Dental, label: 'Outpatient Dental without Prosthesis',
    values: ['inf', 50, 40, 30, 30, 30, 'none', 30, 'none', 15, 30, 10] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.HomeCare, label: 'Outpatient Home Care',
    values: ['inf', 50, 40, 30, 30, 30, 'none', 30, 'none', 'none', 30, 'none'] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.Medications, label: 'Outpatient Medications',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },

  { level: LEVEL.Outpatient, timeblock: BLOCK.Morning, category: CAT.Procedure, label: 'Outpatient 9AM-1PM Consultation',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 30] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.Morning, category: CAT.RADService, label: 'Outpatient 9AM-1PM Lab & Rad (RAD)',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 20] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.Morning, category: CAT.LABService, label: 'Outpatient 9AM-1PM Lab & Rad (LAB)',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 20] },

  { level: LEVEL.Outpatient, timeblock: BLOCK.Afternoon, category: CAT.Procedure, label: 'Outpatient 1PM-5PM Consultation',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 50] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.Afternoon, category: CAT.RADService, label: 'Outpatient 1PM-5PM Lab & Rad (RAD)',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 30] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.Afternoon, category: CAT.LABService, label: 'Outpatient 1PM-5PM Lab & Rad (LAB)',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 30] },

  { level: LEVEL.Outpatient, timeblock: BLOCK.Evening, category: CAT.Procedure, label: 'Outpatient 5PM-8PM Consultation',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.Evening, category: CAT.RADService, label: 'Outpatient 5PM-8PM Lab & Rad (RAD)',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.Evening, category: CAT.LABService, label: 'Outpatient 5PM-8PM Lab & Rad (LAB)',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },

  { level: LEVEL.ER, timeblock: BLOCK.NotRestricted, category: CAT.Procedure, label: 'ER Consultation',
    values: ['inf', 50, 40, 30, 30, 'none', 30, 'none', 'none', 30, 30, 10] },
  { level: LEVEL.ER, timeblock: BLOCK.NotRestricted, category: CAT.RADService, label: 'ER Lab & Rad (RAD)',
    values: ['inf', 50, 40, 30, 30, 'none', 30, 'none', 'none', 30, 30, 10] },
  { level: LEVEL.ER, timeblock: BLOCK.NotRestricted, category: CAT.LABService, label: 'ER Lab & Rad (LAB)',
    values: ['inf', 50, 40, 30, 30, 'none', 30, 'none', 'none', 30, 30, 10] },
  { level: LEVEL.ER, timeblock: BLOCK.NotRestricted, category: CAT.DAMA, label: 'ER DAMA',
    values: ['inf', 50, 40, 30, 30, 'none', 30, 'none', 'none', 30, 30, 'none'] },
];

export interface SeedProgress {
  total: number;
  done: number;
  failed: { name: string; error: string }[];
}

export async function seedDiscountLimitMatrix(
  onProgress?: (p: SeedProgress) => void
): Promise<SeedProgress> {
  const progress: SeedProgress = { total: GROUPS.length * POSITION_ORDER.length, done: 0, failed: [] };

  for (const group of GROUPS) {
    for (let i = 0; i < POSITION_ORDER.length; i++) {
      const position = POSITION_ORDER[i];
      const cell = group.values[i];
      const name = `${group.label} - ${POSITION_ENTRIES[i].abbr}`;
      try {
        await Dis_discountlimitmatrixesService.create({
          dis_name: name,
          dis_servicelevel: group.level,
          dis_timeblock: group.timeblock,
          dis_servicecategory: group.category,
          dis_position: position,
          dis_isunlimited: cell === 'inf',
          dis_hasauthority: cell !== 'none',
          dis_authorizedlimitpercent: typeof cell === 'number' ? cell : undefined,
          statecode: 0,
        });
      } catch (err) {
        progress.failed.push({ name, error: err instanceof Error ? err.message : String(err) });
      }
      progress.done++;
      onProgress?.({ ...progress });
    }
  }

  return progress;
}
