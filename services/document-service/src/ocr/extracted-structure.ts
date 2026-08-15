/** Structured extraction result persisted as JSON (document-service OCR pipeline). */
export interface DocumentSection {
  /** Clause / subclause reference when known (e.g. "4.1", "A.2"). */
  clauseNumber?: string | null;
  heading: string;
  content: string;
  bullets?: string[];
  /** Brief summary/abstract of what this clause mandates (for standards: key requirement, for products: section purpose). */
  summary?: string | null;
  /** Important compliance notes, critical requirements, or regulatory implications. */
  importantNotes?: string[] | null;
}

/** Product document profile — maps to Overview / Specifications tabs (Qleer-style UI) */
export interface ProductBasicInformation {
  reference?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  revision?: string | null;
  category?: string | null;
  subCategory?: string | null;
  tradeMark?: string | null;
  manufacturer?: string | null;
  countryOfOrigin?: string | null;
}

export interface ProductUsageInformation {
  environment?: string | null;
  users?: string | null;
  tempHumidity?: string | null;
  ipRating?: string | null;
}

/** Single row for quality traceability (specs, materials, regulatory — one table in UI). */
export interface QualityTraceabilityRow {
  category?: string | null;
  parameter?: string | null;
  value?: string | null;
  unit?: string | null;
  notes?: string | null;
}

/** One product certification read off a certificate / declaration of conformity. */
export interface ProductOnboardingCertification {
  standardName?: string | null;
  certifyingBody?: string | null;
  certificateNumber?: string | null;
  marketScope?: string | null;
  /** ISO date (YYYY-MM-DD) when the source states one. */
  issueDate?: string | null;
  expiryDate?: string | null;
}

/**
 * Wizard-shaped draft of the product profile — one key per field of the
 * "Add product" onboarding steps, so an uploaded document can pre-fill the form
 * for the user to verify. Every field is a suggestion, never authoritative.
 */
export interface ProductOnboardingDraft {
  // Identity
  productName?: string | null;
  sku?: string | null;
  brandName?: string | null;
  productFamily?: string | null;
  category?: string | null;
  /** 'finished' | 'semi_finished' | 'component' | 'raw_material' | 'service' */
  productType?: string | null;
  description?: string | null;
  // Technical
  intendedUse?: string | null;
  targetUsers?: string[] | null;
  keyMaterials?: string[] | null;
  /** 'Solid' | 'Liquid' | 'Gas' | 'Powder' | 'Paste' | 'Other' */
  physicalForm?: string | null;
  hsTariffCode?: string | null;
  countryOfOrigin?: string | null;
  // Markets
  targetMarkets?: string[] | null;
  requiredCertifications?: string[] | null;
  applicableRegulations?: string[] | null;
  industryLabels?: string[] | null;
  // Manufacturing
  productionSites?: string[] | null;
  productionProcesses?: string[] | null;
  criticalSuppliers?: string[] | null;
  // Certifications
  productCertifications?: ProductOnboardingCertification[] | null;
}

export interface ProductProfile {
  basicInformation?: ProductBasicInformation | null;
  usage?: ProductUsageInformation | null;
  /** Certification marks / standards / approval numbers printed on the document. */
  certifications?: {
    marks?: string[] | null;
    standards?: string[] | null;
    approvalNumbers?: string[] | null;
  } | null;
  /** Pre-fill payload for the product onboarding wizard (see ProductOnboardingDraft). */
  onboarding?: ProductOnboardingDraft | null;
  generalDescription?: string | null;
  applications?: string | null;
  /** Quality-focused narrative: requirements, critical characteristics, inspection relevance */
  qualitySpecificationNarrative?: string | null;
  /** Regulatory / safety notes (CE, warnings, standards cited on label) */
  regulatoryNotes?: string | null;
  /** Free text legacy field; prefer qualitySpecificationNarrative + traceabilityRows for new extractions */
  technicalCharacteristics?: string | null;
  /** Legacy bullets; avoid duplicating traceabilityRows */
  technicalBullets?: string[] | null;
  /** Unified table: specifications, materials/BOM, dimensions — category distinguishes rows */
  traceabilityRows?: QualityTraceabilityRow[] | null;
}

export interface ExtractedStructure {
  title?: string | null;
  documentTypeGuess?: string | null;
  classification?: string | null;
  sections?: DocumentSection[];
  keyPoints?: string[];
  /** PDF/Office: one-paragraph summary of what this file establishes (purpose + key facts). */
  fileSummary?: string | null;
  /** Images: what is visible (objects, labels, warnings, packaging text) — “visual understanding”. */
  visualDescription?: string | null;
  /** Populated for PRODUCT_DOC / EVIDENCE — UI Overview + Specifications */
  productProfile?: ProductProfile | null;
  /** Normative standard metadata (ISO, EN, IEC, etc.) from cover / title block (Standards Library) */
  standardMetadata?: {
    reference?: string | null;
    title?: string | null;
    categories?: string[] | null;
    effectiveDate?: string | null;
  } | null;
}
