import { SERVICE_CATEGORY_CODE } from './optionSets';
import { normalizeText } from './textUtils';

/**
 * DotCare service category (EnName, as sent in dis_servicecategorydotcare) -> Approval Matrix
 * Service Category. DotCare categories missing here (Medical Consumable, Blood Products, Others)
 * have no matrix equivalent and are flagged "Unmatched Service". DotCare is the only source of a
 * request's category, so the matrix's Dental, Home Care, Mortality and DAMA rows never match.
 */
const DOTCARE_TO_MATRIX: Record<string, number> = {
  Medication: SERVICE_CATEGORY_CODE.Medications,
  Procedure: SERVICE_CATEGORY_CODE.Procedures,
  'LAB Service': SERVICE_CATEGORY_CODE.LabAndRad,
  RADService: SERVICE_CATEGORY_CODE.LabAndRad,
  Microbiology: SERVICE_CATEGORY_CODE.LabAndRad,
  Packages: SERVICE_CATEGORY_CODE.ORPackages,
  Operations: SERVICE_CATEGORY_CODE.ORPackages,
  'Medical Service': SERVICE_CATEGORY_CODE.Consultation,
};

/** Keyed by normalized name so casing/spacing differences from DotCare still match. */
const MATRIX_CODE_BY_DOTCARE_NAME = new Map(
  Object.entries(DOTCARE_TO_MATRIX).map(([name, code]) => [normalizeText(name), code])
);

/** Matrix Service Category code for a DotCare category name, or undefined when it has no mapping. */
export function mapDotcareServiceCategory(dotcareName: string | null | undefined): number | undefined {
  return MATRIX_CODE_BY_DOTCARE_NAME.get(normalizeText(dotcareName));
}
