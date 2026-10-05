/**
 * AHJ Discount Policy approval matrix as data (no Dataverse calls), shared by the dev seed and
 * the evaluation tests so both always use exactly the same rules.
 */
import {
  SERVICE_LEVEL,
  SERVICE_CATEGORY,
  SERVICE_CATEGORY_CODE,
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

const CAT = SERVICE_CATEGORY_CODE;

// Outpatient's block-time phase rows are folded into the Outpatient service level
// (per user request), differentiated only by dis_timeblock.
const GROUPS: MatrixGroup[] = [
  { level: LEVEL.Inpatient, timeblock: BLOCK.NotRestricted, category: CAT.Mortality, label: 'Inpatient Mortality',
    values: ['inf', 50, 40, 30, 30, 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },
  { level: LEVEL.Inpatient, timeblock: BLOCK.NotRestricted, category: CAT.ORPackages, label: 'Inpatient OR Packages',
    values: ['inf', 50, 35, 25, 25, 30, 'none', 'none', 'none', 25, 25, 10] },
  { level: LEVEL.Inpatient, timeblock: BLOCK.NotRestricted, category: CAT.DAMA, label: 'Inpatient DAMA',
    values: ['inf', 50, 40, 30, 30, 'none', 'none', 'none', 30, 30, 'none', 'none'] },

  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.Consultation, label: 'Outpatient Consultation',
    values: ['inf', 50, 40, 30, 30, 30, 'none', 30, 'none', 15, 30, 10] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.LabAndRad, label: 'Outpatient Lab & Rad',
    values: ['inf', 50, 40, 30, 30, 30, 'none', 30, 'none', 15, 30, 10] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.Dental, label: 'Outpatient Dental without Prosthesis',
    values: ['inf', 50, 40, 30, 30, 30, 'none', 30, 'none', 15, 30, 10] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.HomeCare, label: 'Outpatient Home Care',
    values: ['inf', 50, 40, 30, 30, 30, 'none', 30, 'none', 'none', 30, 'none'] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.NotRestricted, category: CAT.Medications, label: 'Outpatient Medications',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },

  { level: LEVEL.Outpatient, timeblock: BLOCK.Morning, category: CAT.Consultation, label: 'Outpatient 9AM-1PM Consultation',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 30] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.Morning, category: CAT.LabAndRad, label: 'Outpatient 9AM-1PM Lab & Rad',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 20] },

  { level: LEVEL.Outpatient, timeblock: BLOCK.Afternoon, category: CAT.Consultation, label: 'Outpatient 1PM-5PM Consultation',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 50] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.Afternoon, category: CAT.LabAndRad, label: 'Outpatient 1PM-5PM Lab & Rad',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 30] },

  { level: LEVEL.Outpatient, timeblock: BLOCK.Evening, category: CAT.Consultation, label: 'Outpatient 5PM-8PM Consultation',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },
  { level: LEVEL.Outpatient, timeblock: BLOCK.Evening, category: CAT.LabAndRad, label: 'Outpatient 5PM-8PM Lab & Rad',
    values: ['inf', 50, 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'] },

  { level: LEVEL.ER, timeblock: BLOCK.NotRestricted, category: CAT.Consultation, label: 'ER Consultation',
    values: ['inf', 50, 40, 30, 30, 'none', 30, 'none', 'none', 30, 30, 10] },
  { level: LEVEL.ER, timeblock: BLOCK.NotRestricted, category: CAT.LabAndRad, label: 'ER Lab & Rad',
    values: ['inf', 50, 40, 30, 30, 'none', 30, 'none', 'none', 30, 30, 10] },
  { level: LEVEL.ER, timeblock: BLOCK.NotRestricted, category: CAT.DAMA, label: 'ER DAMA',
    values: ['inf', 50, 40, 30, 30, 'none', 30, 'none', 'none', 30, 30, 'none'] },
];

/** One dis_discountlimitmatrix record per (group, position) cell, ready to create in Dataverse. */
export function buildMatrixRecords() {
  return GROUPS.flatMap((group) =>
    POSITION_ORDER.map((position, i) => {
      const cell = group.values[i];
      return {
        dis_name: `${group.label} - ${POSITION_ENTRIES[i].abbr}`,
        dis_servicelevel: group.level,
        dis_timeblock: group.timeblock,
        dis_servicecategory: group.category,
        dis_position: position,
        dis_isunlimited: cell === 'inf',
        dis_hasauthority: cell !== 'none',
        dis_authorizedlimitpercent: typeof cell === 'number' ? cell : undefined,
        statecode: 0 as const,
      };
    })
  );
}
