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
  revision?: string | null;
  category?: string | null;
  subCategory?: string | null;
  tradeMark?: string | null;
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

export interface ProductProfile {
  basicInformation?: ProductBasicInformation | null;
  usage?: ProductUsageInformation | null;
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
