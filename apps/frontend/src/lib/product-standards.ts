/**
 * Standards & regulations a product declares in the product wizard.
 *
 * The Markets and Certifications steps capture what the product must comply with
 * (required certifications, applicable regulations, industry labels, and issued
 * certificates). The compliance engine reuses those declarations so picking a
 * product document narrows the standard to evaluate against, instead of leaving
 * the user to remember which of the library's standards applies.
 */

export type ProductStandardSource =
  | 'requiredCertification'
  | 'applicableRegulation'
  | 'industryLabel'
  | 'certificate'
  | 'documentText';

export interface ProductStandardRef {
  /** Display value, e.g. "ISO 13485" or "Regulation (EU) 2017/745". */
  value: string;
  source: ProductStandardSource;
  /** Where it came from, shown as a grouping label. */
  sourceLabel: string;
}

const SOURCE_LABELS: Record<ProductStandardSource, string> = {
  requiredCertification: 'Required certification',
  applicableRegulation: 'Applicable regulation',
  industryLabel: 'Industry label',
  certificate: 'Product certificate',
  documentText: 'Cited in the document',
};

/**
 * Standard and regulation references written in the body of a document.
 *
 * The AI fills `certifications` / `applicableRegulations` only when a document
 * states them as such; a specification that merely writes "tested per IEC 62471"
 * in a sentence leaves those fields empty. Scanning the extracted text catches
 * those citations, so the wizard can still offer them for the portal.
 *
 * Each pattern demands a number: bare body names ("ISO", "ASTM") match any
 * quality manual that mentions standards in passing and are not references.
 */
const STANDARD_TEXT_PATTERNS: RegExp[] = [
  /\b(?:EN\s+)?ISO(?:\/[A-Z]{2,4})?[\s-]?\d{3,5}(?:-\d{1,3})?(?::\d{4})?\b/gi,
  /\b(?:EN\s+)?IEC[\s-]?\d{4,5}(?:-\d{1,3})?(?::\d{4})?\b/gi,
  /\bEN[\s-]?\d{3,5}(?:-\d{1,3})?(?::\d{4})?\b/gi,
  /\bASTM[\s-]?[A-Z]\d{2,4}(?:-\d{2})?\b/gi,
  /\bUL[\s-]?\d{2,4}\b/gi,
  /\bRegulation\s*\(\s*(?:EU|EC)\s*\)\s*(?:No\.?\s*)?\d{1,4}\/\d{2,4}\b/gi,
  /\bDirective\s+\d{4}\/\d{1,3}\/(?:EC|EU|EEC)\b/gi,
  /\b21\s*CFR\s*(?:Part\s*)?\d{1,4}(?:\.\d+)?\b/gi,
];

/** References cited in document text, de-duplicated, in the order they appear. */
export function extractStandardRefsFromText(text: string | null | undefined, limit = 30): string[] {
  const haystack = (text ?? '').replace(/\s+/g, ' ');
  if (!haystack) return [];

  const hits: Array<{ index: number; value: string }> = [];
  const seen = new Set<string>();
  for (const pattern of STANDARD_TEXT_PATTERNS) {
    // Shared state: `lastIndex` survives between calls on a /g regex.
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(haystack)) !== null) {
      const value = match[0].trim().replace(/\s+/g, ' ');
      const key = normalizeRef(value);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      hits.push({ index: match.index, value });
    }
  }

  return hits.sort((a, b) => a.index - b.index).slice(0, limit).map((h) => h.value);
}

interface ProductLike {
  requiredCertifications?: string[] | null;
  applicableRegulations?: string[] | null;
  industryLabels?: string[] | null;
  productCertifications?: Array<{ standardName?: string | null }> | null;
}

/** Everything the product declares, de-duplicated, in a stable order. */
export function collectProductStandards(product: ProductLike | null | undefined): ProductStandardRef[] {
  if (!product) return [];
  const out: ProductStandardRef[] = [];
  const seen = new Set<string>();

  const push = (raw: unknown, source: ProductStandardSource) => {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return;
    const key = normalizeRef(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ value, source, sourceLabel: SOURCE_LABELS[source] });
  };

  (product.requiredCertifications ?? []).forEach((v) => push(v, 'requiredCertification'));
  (product.applicableRegulations ?? []).forEach((v) => push(v, 'applicableRegulation'));
  (product.productCertifications ?? []).forEach((c) => push(c?.standardName, 'certificate'));
  (product.industryLabels ?? []).forEach((v) => push(v, 'industryLabel'));

  return out;
}

/** Comparison key: case- and punctuation-insensitive ("EN ISO 13485:2016" → "eniso134852016"). */
export function normalizeRef(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Key that treats the same standard cited with and without its edition year as
 * one entry ("ISO 13485:2016" and "ISO 13485"): a document states the dated
 * form while a user types the short one, and the portal must not hold both.
 *
 * Only a trailing year is dropped, so EN 60601-1 and EN 60601-1-2 remain the
 * different standards they are. Mirrors `refKey` in document.service.ts.
 */
export function standardDedupeKey(value: string): string {
  return normalizeRef(value.replace(/:\s*\d{4}\s*$/, ''));
}

/**
 * Does a library standard document satisfy a declared reference?
 *
 * Declarations are written by hand ("ISO 13485") while documents carry a full
 * designation ("EN ISO 13485:2016"), so containment either way is the useful
 * test. Very short keys are required to match exactly, otherwise "CE" would
 * match almost everything.
 */
export function standardMatchesRef(
  norm: { isoStandard?: string | null; name?: string | null },
  ref: string,
): boolean {
  const key = normalizeRef(ref);
  if (!key) return false;
  const haystacks = [norm.isoStandard, norm.name]
    .map((v) => (typeof v === 'string' ? normalizeRef(v) : ''))
    .filter(Boolean);
  if (haystacks.length === 0) return false;

  return haystacks.some((h) => {
    /**
     * Containment needs length on BOTH sides. A library document titled "u" or
     * "CE" would otherwise be contained in almost every reference ("Regulation
     * (EU) 2017/745" contains "u"), marking every standard as already held.
     */
    if (key.length < 4 || h.length < 4) return h === key;
    return h.includes(key) || key.includes(h);
  });
}
