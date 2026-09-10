/**
 * Content-level ISO detection for the "Upload standard (PDF)" flow.
 *
 * `licensed-standards.ts` is the *title* guardrail: it reads the short text the
 * user typed and asks them to confirm their right to use the copy. This module
 * is the *content* guardrail: it opens the PDF itself and refuses the upload
 * outright when the file turns out to be a published ISO standard, which ISO
 * sells under licence and forbids redistributing.
 *
 * The hard part is telling a real standard apart from the far more common case
 * of a quality manual that merely *cites* one. Two rules keep that in check:
 *
 *  1. Decisive signals — an ISO copyright notice, an ISO reference number, the
 *     ISO copyright office address — are scanned across the whole document.
 *     Nothing but a genuine ISO publication carries those.
 *  2. Every weaker signal (front-matter structure, publication metadata,
 *     committee references, standards vocabulary) is scanned **only in the
 *     front matter**, the first few pages. A real standard prints its identity
 *     on the cover; a manual that cites ISO 9001 in clause 4.2 does not.
 *
 * Detection therefore needs either one decisive hit or a dense pile-up of
 * front-matter evidence before it blocks anything.
 */

/** Weight bands. A single decisive hit is enough on its own. */
const DECISIVE = 100;
const STRONG = 40;
const MEDIUM = 15;
const WEAK = 5;

/** Total weight at which a document is treated as a published ISO standard. */
export const ISO_CONTENT_THRESHOLD = 100;

/** Pages treated as front matter: cover, copyright page, contents, foreword. */
export const ISO_FRONT_MATTER_PAGES = 6;

/** Pages read from the PDF at most, so a 900-page file cannot stall the dialog. */
export const ISO_SCAN_MAX_PAGES = 12;

export interface IsoContentSignal {
  /** Rule group, shown to the user as the reason line. */
  category: string;
  weight: number;
  /** The exact text that matched, so the alert can quote the document. */
  evidence: string;
}

export interface IsoContentFinding {
  /** True when the file should be refused. */
  isIsoStandard: boolean;
  /** Summed weight of every distinct signal. */
  score: number;
  /** Whether a decisive signal (copyright notice, reference number…) matched. */
  decisive: boolean;
  /** Distinct signals, heaviest first. */
  signals: IsoContentSignal[];
  /** Standard numbers seen in the front matter, e.g. ["ISO 9001:2015"]. */
  standardNumbers: string[];
}

interface Rule {
  category: string;
  weight: number;
  pattern: RegExp;
  /** Decisive rules scan the whole document; the rest only the front matter. */
  scope: 'document' | 'frontMatter';
  /**
   * When set, the match only counts if `pattern` also appears within `window`
   * characters of it. Used for boilerplate that is damning next to an ISO
   * ownership claim and meaningless on its own.
   */
  requiresNear?: { pattern: RegExp; window: number };
}

/**
 * Text that asserts ISO *owns* the document, as opposed to merely naming it.
 * "© ISO 2015", "Permission can be requested from either ISO", "ISO copyright
 * office" — never produced by a manual that only cites a standard.
 */
const ISO_OWNERSHIP =
  /©\s*ISO\b|\bISO\s+copyright\b|\bfrom\s+(?:either\s+)?ISO\b|\bISO\s+at\s+the\s+address\b|\bISO\s+\d{4}\b|\bPublished\s+in\s+Switzerland\b|\bInternational\s+Organization\s+for\s+Standardization\b/i;

/**
 * ISO standard number, e.g. "ISO 9001:2015", "ISO/IEC 27001", "ISO 13485-1".
 * Kept as its own export because the alert quotes the numbers it finds.
 */
export const ISO_NUMBER_PATTERN =
  /\bISO(?:\s*\/\s*(?:IEC|TC|ASTM|IEEE|CIE|TS|TR|PAS|FDIS|DIS|NP|CD|WD|PRF))?\s*\d{3,6}(?:\s*[-–]\s*\d{1,3})?(?:\s*:\s*\d{4})?\b/gi;

const RULES: Rule[] = [
  // ── Decisive: only a genuine ISO publication carries these ─────────────────
  {
    category: 'ISO copyright notice',
    weight: DECISIVE,
    scope: 'document',
    pattern: /©\s*ISO(?:\s*\/\s*IEC)?\b|\bCopyright\s+ISO\b|\bCopyright\s+International\s+Organization\s+for\s+Standardization\b|\bCopyright\s+International\s+Electrotechnical\s+Commission\b|\bISO\s+copyright\s+office\b|\bISO\s+copyright\b/i,
  },
  {
    category: 'ISO reference number',
    weight: DECISIVE,
    scope: 'document',
    pattern: /\b(?:Reference|Document)\s+number\s*:?\s*ISO\b/i,
  },
  {
    category: 'ISO standard cover heading',
    weight: DECISIVE,
    scope: 'document',
    pattern: /\b(?:INTERNATIONAL\s+STANDARD|TECHNICAL\s+SPECIFICATION|TECHNICAL\s+REPORT|PUBLICLY\s+AVAILABLE\s+SPECIFICATION|(?:FINAL\s+)?DRAFT\s+INTERNATIONAL\s+STANDARD)\s+ISO\b/i,
  },
  {
    // Deliberately NOT triggered by "All rights reserved" or by the reproduction
    // boilerplate on its own: every company puts both in its own quality manual.
    // It counts only next to a claim that ISO owns the text.
    category: 'ISO redistribution prohibition',
    weight: DECISIVE,
    scope: 'document',
    pattern: /\bNo\s+part\s+of\s+this\s+(?:publication|document)\s+may\s+be\s+reproduced\b|\bCOPYRIGHT\s+PROTECTED\s+DOCUMENT\b/i,
    requiresNear: { pattern: ISO_OWNERSHIP, window: 400 },
  },

  // ── Strong: identity signals, front matter only ───────────────────────────
  {
    category: 'ISO standard number',
    weight: STRONG,
    scope: 'frontMatter',
    pattern: new RegExp(ISO_NUMBER_PATTERN.source, 'i'),
  },
  {
    category: 'ISO technical committee',
    weight: STRONG,
    scope: 'frontMatter',
    pattern: /\bISO\s*\/\s*(?:TC\s*\d{1,4}(?:\s*\/\s*SC\s*\d{1,3})?|IEC\s+JTC\s*\d)\b/i,
  },
  {
    category: 'ISO deliverable type',
    weight: STRONG,
    scope: 'frontMatter',
    pattern: /\bISO\s*\/\s*(?:TS|TR|PAS|FDIS|DIS|NP|CD|WD|PRF)\b|\bInternational\s+Standard\b|\b(?:Final\s+)?Draft\s+International\s+Standard\b|\bPublicly\s+Available\s+Specification\b|\bTechnical\s+Specification\b|\bTechnical\s+Report\b|\bCommittee\s+Draft\b/i,
  },
  {
    category: 'Reproduction restrictions',
    weight: STRONG,
    scope: 'frontMatter',
    pattern: /\bStorage\s+in\s+a\s+retrieval\s+system\b|\bReproduction\s+(?:is\s+prohibited|rights)\b|\bPermission\s+to\s+(?:reproduce|copy|distribute)\b|\bWithout\s+(?:prior\s+)?permission\b|\bWritten\s+permission\b|\b(?:Electronic|Mechanical)\s+reproduction\b|\bPhotocopy(?:ing)?\b/i,
  },

  // ── Medium: publication metadata and ISO front-matter structure ───────────
  {
    category: 'ISO publication metadata',
    weight: MEDIUM,
    scope: 'frontMatter',
    pattern: /\bICS\s*[:\s]\s*\d{2}(?:\.\d{3})*\b|\bInternational\s+Classification\s+for\s+Standards\b|\bISO\s+Online\s+Browsing\s+Platform\b|\bISO\s+OBP\b|\bISO\s+Catalogue\b/i,
  },
  {
    category: 'Standard edition statement',
    weight: MEDIUM,
    scope: 'frontMatter',
    pattern: /\b(?:First|Second|Third|Fourth|Fifth|Sixth)\s+edition\b|\bEdition\s+\d\b/i,
  },
  {
    category: 'ISO clause structure',
    weight: MEDIUM,
    scope: 'frontMatter',
    pattern: /\bNormative\s+references\b|\bTerms\s+and\s+definitions\b|\bSymbols\s+and\s+abbreviated\s+terms\b|\b(?:Normative|Informative)\s+annex\b|\bAnnex\s+[A-C]\b/i,
  },
  {
    category: 'Standards development process',
    weight: MEDIUM,
    scope: 'frontMatter',
    pattern: /\bMember\s+bodies\b|\bNational\s+standards\s+body\b|\bSecretariat\b|\bTechnical\s+Committee\b|\bSubcommittee\b|\bWorking\s+Group\b/i,
  },
  {
    category: 'Peer standards bodies',
    weight: MEDIUM,
    scope: 'frontMatter',
    pattern: /\bInternational\s+Electrotechnical\s+Commission\b|\bCENELEC\b|\bAFNOR\b|\bASTM\b|\bCEN\b(?![A-Z])/i,
  },

  // ── Weak: vocabulary any standard-shaped text shares ──────────────────────
  {
    category: 'Standards vocabulary',
    weight: WEAK,
    scope: 'frontMatter',
    pattern: /\bConformity\s+assessment\b|\bNon-?conformity\b|\bNormative\b|\bSpecified\s+requirements\b|\bshall\s+not\b/i,
  },
  {
    category: 'Standard title pattern',
    weight: WEAK,
    scope: 'frontMatter',
    pattern: /\b(?:General\s+requirements|Requirements\s+and\s+guidance|Vocabulary|Fundamentals\s+and\s+vocabulary|Test\s+methods)\b/i,
  },
];

/** True when `near.pattern` occurs within `near.window` characters of a match. */
function hasNear(
  haystack: string,
  index: number,
  length: number,
  near: { pattern: RegExp; window: number },
): boolean {
  const start = Math.max(0, index - near.window);
  const end = Math.min(haystack.length, index + length + near.window);
  return near.pattern.test(haystack.slice(start, end));
}

/** Trim a match to something short enough to quote back in a UI alert. */
function quote(raw: string): string {
  const clean = raw.replace(/\s+/g, ' ').trim();
  return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean;
}

/**
 * Score already-extracted text.
 *
 * @param frontMatter Text of the first `ISO_FRONT_MATTER_PAGES` pages.
 * @param fullText    Text of every page scanned (front matter included).
 */
export function detectIsoStandardContent(frontMatter: string, fullText: string): IsoContentFinding {
  const front = (frontMatter ?? '').trim();
  const full = (fullText ?? '').trim() || front;

  const signals: IsoContentSignal[] = [];
  let decisive = false;

  for (const rule of RULES) {
    const haystack = rule.scope === 'document' ? full : front;
    if (!haystack) continue;
    const m = rule.pattern.exec(haystack);
    if (!m) continue;
    if (rule.requiresNear && !hasNear(haystack, m.index, m[0].length, rule.requiresNear)) continue;
    if (rule.weight === DECISIVE) decisive = true;
    signals.push({ category: rule.category, weight: rule.weight, evidence: quote(m[0]) });
  }

  const standardNumbers = Array.from(
    new Set((front.match(ISO_NUMBER_PATTERN) ?? []).map((n) => n.replace(/\s+/g, ' ').trim())),
  ).slice(0, 5);

  const score = signals.reduce((sum, s) => sum + s.weight, 0);
  signals.sort((a, b) => b.weight - a.weight);

  return {
    isIsoStandard: decisive || score >= ISO_CONTENT_THRESHOLD,
    score,
    decisive,
    signals,
    standardNumbers,
  };
}

/**
 * Read text out of a PDF in the browser.
 *
 * Mirrors the lazy-import + pinned-worker setup in `PdfViewer.tsx`: pdfjs is
 * heavy and must not land in the main bundle, and the worker version has to
 * match the API version exactly or Turbopack fails to resolve it at runtime.
 *
 * Returns empty strings for a scanned PDF with no text layer — the caller
 * treats "no text" as "cannot tell", never as "not a standard".
 */
export async function extractPdfTextForScan(
  file: File,
): Promise<{ frontMatter: string; fullText: string; pagesRead: number; hasTextLayer: boolean }> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;

  const pagesRead = Math.min(doc.numPages, ISO_SCAN_MAX_PAGES);
  const pageTexts: string[] = [];

  for (let i = 1; i <= pagesRead; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ');
    pageTexts.push(text);
  }

  await doc.destroy().catch(() => undefined);

  const fullText = pageTexts.join('\n');
  return {
    frontMatter: pageTexts.slice(0, ISO_FRONT_MATTER_PAGES).join('\n'),
    fullText,
    pagesRead,
    hasTextLayer: fullText.replace(/\s/g, '').length > 0,
  };
}

/** Extract + score in one call. `null` means the PDF has no readable text. */
export async function scanPdfForIsoStandard(file: File): Promise<IsoContentFinding | null> {
  const { frontMatter, fullText, hasTextLayer } = await extractPdfTextForScan(file);
  if (!hasTextLayer) return null;
  return detectIsoStandardContent(frontMatter, fullText);
}

/** Headline of the blocking alert. */
export function isoContentAlertTitle(finding: IsoContentFinding): string {
  const ref = finding.standardNumbers[0];
  return ref
    ? `This PDF looks like the published ${ref} standard`
    : 'This PDF looks like a published ISO standard';
}

/** Body of the blocking alert: what was detected, and why it is refused. */
export function isoContentAlertMessage(finding: IsoContentFinding): string {
  const evidence = finding.signals
    .slice(0, 3)
    .map((s) => `${s.category} ("${s.evidence}")`)
    .join(', ');
  return (
    `Detected ${evidence}. ISO sells its standards under licence and forbids ` +
    'redistribution, so Qurelio cannot store a copy of the standard itself. ' +
    'The file was not uploaded. Upload your own documentation instead — a ' +
    'quality manual, procedure, or a summary that cites the standard.'
  );
}
