/**
 * Resolver behind the applicability reason modal.
 *
 * The results table lists compliance labels exactly as they sit on the product
 * record (`requiredCertifications` + `applicableRegulations`) — long, human-written
 * strings that cite one or several instruments. This module turns one of those
 * labels into everything the modal renders, from three sources in priority order:
 *
 *   1. the applicability matrix — a per-product engine assessment (verdict,
 *      scores, why, obligations, evidence, version drift);
 *   2. the global reference catalog — instrument metadata, when the engine has
 *      no assessment for this product/reference pair;
 *   3. the product's own `productCertifications` — for the certificate labels,
 *      which are not regulatory instruments at all.
 *
 * Anything that matches none of the three still resolves: the modal falls back to
 * the product's attributes and says plainly that nothing is assessed yet. Scores
 * are never invented — they are present only when the matrix supplies them.
 */

import catalogData from '@/data/regulatory_reference_catalog.json';
import matrixData from '@/data/regulatory_applicability_matrix.json';
import useCasesData from '@/data/applicability_use_cases.json';

/* ── Product shape (subset of the document-service product record) ─────────── */

export interface ProductCertification {
  standardName?: string;
  certificateNumber?: string;
  certifyingBody?: string;
  issueDate?: string;
  expiryDate?: string;
  marketScope?: string;
}

export interface ApplicabilityProduct {
  id: string;
  name: string;
  reference?: string;
  sku?: string;
  physicalForm?: string;
  productType?: string;
  productFamily?: string;
  countryOfOrigin?: string;
  intendedUse?: string;
  categoryTags?: string[];
  targetMarkets?: string[];
  targetUsers?: string[];
  productionSites?: string[];
  productionProcesses?: string[];
  keyMaterials?: string[];
  criticalSuppliers?: string[];
  requiredCertifications?: string[];
  applicableRegulations?: string[];
  productCertifications?: ProductCertification[];
}

/* ── Normalised detail consumed by the modal ───────────────────────────────── */

export type DetailKind = 'ASSESSED' | 'CATALOG_ONLY' | 'CERTIFICATE' | 'UNRESOLVED';
export type VerdictTone = 'applicable' | 'conditional' | 'must' | 'review' | 'na' | 'neutral';
export type Coverage = 'COVERED' | 'PARTIAL' | 'MISSING' | 'NOT_ASSESSED';
export type LegalTier = 'INGESTIBLE' | 'REFERENCE_ONLY' | 'USER_UPLOAD';

export interface Signal {
  k: string;
  v: string;
}
export interface EvidenceItem {
  kind: 'attribute' | 'document' | 'external';
  label: string;
  detail?: string;
}
export interface MetaCell {
  label: string;
  value: string;
  tone?: 'default' | 'warn' | 'bad';
  mono?: boolean;
}
export interface Obligation {
  clause: string;
  text: string;
}

export interface ApplicabilityDetail {
  /** Stable key for the label this detail was built from. */
  key: string;
  kind: DetailKind;
  /** The compliance label as it appears on the product record. */
  label: string;
  /** Canonical instrument citation (or the label itself when unresolved). */
  reference: string;
  shortCode?: string;
  regulationId?: string;
  title?: string;

  verdict: string;
  verdictTone: VerdictTone;
  verdictText: string;
  condition?: string;

  applicabilityScore?: number;
  confidenceScore?: number;
  impact?: string;
  role?: string;

  tier?: LegalTier;
  tierLabel?: string;
  engineCapability?: string;

  versionHeld?: string;
  versionInForce?: string;
  versionStatus?: string;
  versionDriftDays?: number;
  versionNote?: string;

  meta: MetaCell[];
  signals: Signal[];
  reason: string;
  evidence: EvidenceItem[];
  obligations: Obligation[];
  gapIds: string[];
  changeEventIds: string[];
  engineNote?: string;
  assessedAt?: string;
  assignmentSource?: string;
  /** Other instruments cited by the same label — switchable in the modal. */
  alternates: { key: string; label: string }[];
}

/* ── Raw data ──────────────────────────────────────────────────────────────── */

interface CatalogEntry {
  regulation_id: string;
  reference: string;
  short_code?: string;
  title?: string;
  aliases?: string[];
  type?: string;
  authority?: string;
  jurisdiction?: string;
  country_region?: string;
  category?: string;
  legal_status?: string;
  engine_capability?: string;
  current_version?: string;
  previous_version?: string;
  source?: string;
  source_url?: string;
}

interface MatrixRef {
  regulation_id: string;
  reference: string;
  short_code?: string;
  legal_status?: string;
  role?: string;
  applicability_score?: number;
  confidence_score?: number;
  verdict?: string;
  condition?: string;
  impact_level?: string;
  assignment_source?: string;
  assigned_at?: string;
  detected_at?: string;
  tenant_version_held?: string;
  current_version?: string;
  version_status?: string;
  version_drift_days?: number;
  why_applicable?: string;
  reason?: string;
  key_obligations?: string[];
  evidence?: { type?: string; field?: string; value?: string; doc_id?: string; ref?: string }[];
  linked_gaps?: string[];
  linked_change_events?: string[];
  engine_note?: string;
  monographs_tracked?: string[];
  is_fabricated_for_demo?: boolean;
}

interface MatrixProduct {
  product_name: string;
  galenic_form?: string;
  last_applicability_run?: string;
  product_specific_references: MatrixRef[];
  ruled_out: MatrixRef[];
}

const CATALOG: CatalogEntry[] = (catalogData as { catalog: CatalogEntry[] }).catalog;

const MATRIX = matrixData as unknown as {
  catalog_extensions: CatalogEntry[];
  company_level_references: { inherited_by: string[]; references: MatrixRef[] };
  by_product: Record<string, MatrixProduct>;
};

const USE_CASES = useCasesData as unknown as {
  use_cases: {
    product_id: string;
    version_check_detail?: {
      regulation_id: string;
      held?: string;
      in_force?: string;
      status?: string;
      note?: string;
      legal_note?: string;
    }[];
  }[];
};

/** Catalog + matrix extensions, keyed by regulation id. */
const META_BY_ID = new Map<string, CatalogEntry>();
[...CATALOG, ...(MATRIX.catalog_extensions ?? [])].forEach((e) => {
  const prev = META_BY_ID.get(e.regulation_id);
  META_BY_ID.set(e.regulation_id, prev ? { ...prev, ...e } : e);
});

const TIER_LABEL: Record<LegalTier, string> = {
  INGESTIBLE: 'Ingestible',
  REFERENCE_ONLY: 'Reference only',
  USER_UPLOAD: 'User upload',
};

const TIER_CAPABILITY: Record<LegalTier, string> = {
  INGESTIBLE: 'Full text ingested and AI-analysed',
  REFERENCE_ONLY:
    'Number, scope and edition only — the licensed text is never hosted. Upload your own licensed copy to analyse it.',
  USER_UPLOAD:
    'Not hosted by Qurelio — the tenant uploads the text and accepts legal liability before any analysis.',
};

/* ── Label → instrument anchors ────────────────────────────────────────────────
 * Curated on purpose. A generic alias scorer mismatches badly on these labels
 * ("Annex 15" outscoring "Annex 1", "paediatric" pulling the Paediatric
 * Regulation into a WHO oral-liquid alert), so each instrument declares the
 * patterns that genuinely identify it, with a weight for precision: a numbered
 * citation beats a topic word when a label mentions both.
 */
interface Anchor {
  re: RegExp;
  w: number;
}
const ANCHORS: Record<string, Anchor[]> = {
  'GUID-EU-GMP-ANX1': [
    { re: /annexe?\s*1\b/, w: 90 },
    { re: /sterile gmp/, w: 70 },
    { re: /contamination control/, w: 70 },
  ],
  'GUID-EU-GMP-ANX15': [{ re: /annexe?s?\s*15\b/, w: 90 }],
  'GUID-EU-GMP-ANX16': [{ re: /annexe?s?\s*16\b/, w: 90 }],
  'GUID-EU-GMP-V4': [
    { re: /eudralex/, w: 50 },
    { re: /eu gmp/, w: 40 },
    { re: /bonnes pratiques de fabrication/, w: 40 },
  ],
  'DIR-EU-2001-83': [
    { re: /2001\/83/, w: 95 },
    { re: /community code/, w: 60 },
  ],
  'REG-EC-2008-1234': [
    { re: /1234\/2008/, w: 95 },
    { re: /\bvariations?\b/, w: 45 },
  ],
  'REG-EU-2016-161': [
    { re: /2016\/161/, w: 95 },
    { re: /safety features/, w: 60 },
  ],
  'REG-EC-2006-1901': [
    { re: /1901\/2006/, w: 95 },
    { re: /paediatric regulation/, w: 70 },
  ],
  'REG-EU-2014-536': [{ re: /clinical trials?/, w: 60 }],
  'GUID-EU-EXCIPIENTS': [{ re: /excipients?/, w: 65 }],
  'GUID-EU-TOPICAL': [{ re: /topical products?/, w: 75 }],
  'GUID-EU-BE': [{ re: /bioequivalence/, w: 75 }],
  'GUID-EMA-NITROSAMINE': [{ re: /nitrosamines?/, w: 80 }],
  'GUID-WHO-DEG-EG': [
    { re: /deg\s*\/\s*eg/, w: 90 },
    { re: /diethylene glycol/, w: 85 },
    { re: /contaminated paediatric oral/, w: 85 },
    { re: /oral liquid/, w: 55 },
  ],
  'GUID-TN-GMP': [
    { re: /guide des b/, w: 85 },
    { re: /\bbpf\b/, w: 80 },
    { re: /gmp certificate[^.]*dpm/, w: 60 },
  ],
  'ORD-TN-DPM-2025-09': [
    { re: /circulaire dpm/, w: 90 },
    { re: /dpm circular/, w: 90 },
    { re: /2025-09-04/, w: 85 },
    { re: /04\/09\/2025/, w: 85 },
  ],
  'LAW-TN-85-91': [
    { re: /85-91/, w: 95 },
    { re: /marketing authorisation/, w: 45 },
    { re: /\bamm\b/, w: 45 },
  ],
  'CERT-EDQM-CEP': [
    { re: /\bcep\b/, w: 80 },
    { re: /certification of suitability/, w: 85 },
  ],
  'SCHEME-WHO-CPP': [
    { re: /\bcpp\b/, w: 80 },
    { re: /certificate of a pharmaceutical product/, w: 85 },
  ],
  'PH-EUR': [
    { re: /ph\.?\s*eur/, w: 85 },
    { re: /european pharmacopoeia/, w: 85 },
  ],
  'PH-USP-NF': [
    { re: /\busp\b/, w: 80 },
    { re: /usp\s*[-–]\s*nf/, w: 85 },
  ],
  // Same weight as the other compendial citations, so when a label cites several
  // ("Ph. Eur. 5.1.3 / 5.1.4 and ISO 15378") the one written first leads.
  'STD-ISO-15378': [{ re: /iso\s*15378/, w: 85 }],
  'CFR-21-211': [{ re: /21\s*cfr/, w: 90 }],
  'ICH-M7': [{ re: /\bm7\b/, w: 80 }],
  'ICH-M9': [{ re: /\bm9\b/, w: 80 }],
  'ICH-Q1': [{ re: /\bq1[ab]?\b/, w: 80 }],
  'ICH-Q2': [{ re: /\bq2\b/, w: 80 }],
  'ICH-Q3': [{ re: /\bq3[cd]?\b/, w: 80 }],
  'ICH-Q7': [{ re: /\bq7\b/, w: 80 }],
  'ICH-Q9': [{ re: /\bq9\b/, w: 80 }],
  'ICH-Q10': [{ re: /\bq10\b/, w: 80 }],
};

/** Lowercase, flatten the punctuation the labels use, keep digits and slashes. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/\*\*/g, '')
    .replace(/[—–]/g, ' ')
    .replace(/n[°º]/g, ' ')
    .replace(/[⟨⟩«»"'`]/g, ' ')
    .replace(/[^a-z0-9/.\-()%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface AnchorHit {
  regulationId: string;
  weight: number;
  position: number;
}

/** Every instrument the label cites, strongest first. */
function anchorHits(label: string): AnchorHit[] {
  const n = normalise(label);
  const hits: AnchorHit[] = [];
  Object.entries(ANCHORS).forEach(([regulationId, anchors]) => {
    let best: AnchorHit | null = null;
    anchors.forEach((a) => {
      const m = n.match(a.re);
      if (!m || m.index === undefined) return;
      if (!best || a.w > best.weight) {
        best = { regulationId, weight: a.w, position: m.index };
      }
    });
    if (best) hits.push(best);
  });
  // Strongest anchor wins; on a tie the instrument cited first in the label leads.
  return hits.sort((a, b) => b.weight - a.weight || a.position - b.position);
}

/* ── Product → matrix entry ────────────────────────────────────────────────── */

function matrixProductKey(product: ApplicabilityProduct): string | undefined {
  const entries = Object.entries(MATRIX.by_product);
  const exact = entries.find(([, v]) => v.product_name === product.name);
  if (exact) return exact[0];
  const head = normalise(product.name).split(' ').slice(0, 2).join(' ');
  const loose = entries.find(([, v]) => normalise(v.product_name).startsWith(head));
  return loose?.[0];
}

/** Company-level + product-specific + ruled-out references for this product. */
function referencesFor(productKey: string | undefined): MatrixRef[] {
  if (!productKey) return [];
  const entry = MATRIX.by_product[productKey];
  if (!entry) return [];
  const inherited = MATRIX.company_level_references.inherited_by.includes(productKey)
    ? MATRIX.company_level_references.references
    : [];
  return [...entry.product_specific_references, ...inherited, ...entry.ruled_out];
}

function versionCheckFor(productKey: string | undefined, regulationId: string) {
  if (!productKey) return undefined;
  const uc = USE_CASES.use_cases.find((u) => u.product_id === productKey);
  return uc?.version_check_detail?.find((v) => v.regulation_id === regulationId);
}

/* ── Signals — the product attributes the verdict rests on ─────────────────── */

function productSignals(product: ApplicabilityProduct): Signal[] {
  const s: Signal[] = [];
  const category = product.categoryTags?.[0];
  if (category) s.push({ k: 'Product category', v: category });
  if (product.physicalForm) s.push({ k: 'Physical form', v: product.physicalForm });
  if (product.productType) s.push({ k: 'Product type', v: product.productType });
  if (product.productionSites?.length)
    s.push({ k: 'Manufacturing site', v: product.productionSites.join(' · ') });
  if (product.targetMarkets?.length)
    s.push({
      k: 'Markets',
      v: `${product.targetMarkets.length} — ${product.targetMarkets.slice(0, 3).join(', ')}${
        product.targetMarkets.length > 3 ? '…' : ''
      }`,
    });
  if (product.productionProcesses?.length)
    s.push({ k: 'Processes on record', v: `${product.productionProcesses.length}` });
  if (product.keyMaterials?.length)
    s.push({ k: 'Materials in the formula', v: `${product.keyMaterials.length}` });
  if (product.countryOfOrigin) s.push({ k: 'Origin', v: product.countryOfOrigin });
  return s;
}

function verdictPresentation(verdict: string | undefined): {
  verdict: string;
  tone: VerdictTone;
} {
  switch (verdict) {
    case 'APPLICABLE':
      return { verdict: 'Applicable to this product', tone: 'applicable' };
    case 'CONDITIONAL':
      return { verdict: 'Conditionally applicable', tone: 'conditional' };
    case 'MUST_APPLY':
      return { verdict: 'Must be applied to this product', tone: 'must' };
    case 'SHOULD_REVIEW':
      return { verdict: 'Review recommended', tone: 'review' };
    case 'NOT_APPLICABLE':
      return { verdict: 'Not applicable to this product', tone: 'na' };
    default:
      return { verdict: 'Not assessed for this product', tone: 'neutral' };
  }
}

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Certificate labels ────────────────────────────────────────────────────── */

/** Score a `productCertifications` entry against a compliance label. */
function certificateMatch(
  label: string,
  certs: ProductCertification[] | undefined,
): ProductCertification | undefined {
  if (!certs?.length) return undefined;
  const n = normalise(label);
  let best: { c: ProductCertification; score: number } | undefined;
  certs.forEach((c) => {
    const name = normalise(c.standardName ?? '');
    if (!name) return;
    const words = name.split(' ').filter((w) => w.length > 3);
    const overlap = words.filter((w) => n.includes(w)).length;
    const score = words.length ? overlap / words.length : 0;
    if (score >= 0.5 && (!best || score > best.score)) best = { c, score };
  });
  return best?.c;
}

function certificateDetail(
  key: string,
  label: string,
  product: ApplicabilityProduct,
  cert: ProductCertification,
  alternates: { key: string; label: string }[],
): ApplicabilityDetail {
  const expiry = cert.expiryDate ? new Date(cert.expiryDate) : undefined;
  const now = new Date();
  const daysLeft = expiry
    ? Math.round((expiry.getTime() - now.getTime()) / 86_400_000)
    : undefined;
  const expired = daysLeft !== undefined && daysLeft < 0;
  const expiringSoon = daysLeft !== undefined && daysLeft >= 0 && daysLeft <= 180;

  const verdict = expired
    ? 'Required — certificate expired'
    : expiringSoon
      ? 'Required — renewal due'
      : 'Required and held for this product';
  const tone: VerdictTone = expired ? 'must' : expiringSoon ? 'review' : 'applicable';

  const verdictText = expired
    ? `The certificate on the product record lapsed ${Math.abs(daysLeft!)} days ago. Market access that depends on it is not evidenced until it is renewed.`
    : expiringSoon
      ? `Valid, with ${daysLeft} days left. Renewal lead times for this authority are measured in months, so this is a live action rather than a future one.`
      : 'Held, in date, and recorded against this product. Nothing to action.';

  return {
    key,
    kind: 'CERTIFICATE',
    label,
    reference: cert.standardName ?? label,
    title: 'Certification held on the product record',
    verdict,
    verdictTone: tone,
    verdictText,
    meta: [
      { label: 'Certifying body', value: cert.certifyingBody ?? '—' },
      { label: 'Certificate number', value: cert.certificateNumber ?? '—', mono: true },
      { label: 'Market scope', value: cert.marketScope ?? '—' },
      { label: 'Issued', value: formatDate(cert.issueDate) ?? '—' },
      {
        label: 'Expires',
        value: formatDate(cert.expiryDate) ?? '—',
        tone: expired ? 'bad' : expiringSoon ? 'warn' : 'default',
      },
      {
        label: 'Validity',
        value: expired
          ? `Expired ${Math.abs(daysLeft!)} days ago`
          : daysLeft !== undefined
            ? `${daysLeft} days remaining`
            : 'No expiry recorded',
        tone: expired ? 'bad' : expiringSoon ? 'warn' : 'default',
      },
    ],
    signals: productSignals(product),
    reason:
      'This entry is a certification held on the product record, not a regulatory instrument. It is required because of what the product is and where it is placed on the market — the attributes below are what put it in scope.',
    evidence: [
      {
        kind: 'attribute',
        label: 'Product record — productCertifications',
        detail: [cert.standardName, cert.certificateNumber, cert.certifyingBody]
          .filter(Boolean)
          .join(' · '),
      },
    ],
    obligations: [],
    gapIds: [],
    changeEventIds: [],
    alternates,
  };
}

/* ── Main resolver ─────────────────────────────────────────────────────────── */

/** Key used when the modal focuses the certificate rather than a cited instrument. */
export const CERTIFICATE_KEY = '__certificate__';

/** An anchor at least this strong is a precise citation, not a topic word. */
const CITATION_WEIGHT = 60;

export function buildDetail(
  product: ApplicabilityProduct,
  label: string,
  /** Which cited instrument to show, when the label cites several. */
  focusRegulationId?: string,
): ApplicabilityDetail {
  const productKey = matrixProductKey(product);
  const refs = referencesFor(productKey);
  const hits = anchorHits(label);

  // Anchors that this product actually has an assessment or catalog entry for.
  const resolvable = hits.filter(
    (h) => refs.some((r) => r.regulation_id === h.regulationId) || META_BY_ID.has(h.regulationId),
  );

  const cert = certificateMatch(label, product.productCertifications);

  const alternates = resolvable.map((h) => {
    const meta = META_BY_ID.get(h.regulationId);
    const fromMatrix = refs.find((r) => r.regulation_id === h.regulationId);
    return {
      key: h.regulationId,
      label: meta?.short_code ?? fromMatrix?.short_code ?? meta?.reference ?? h.regulationId,
    };
  });
  if (cert) alternates.unshift({ key: CERTIFICATE_KEY, label: 'Certificate held' });

  const explicit = focusRegulationId
    ? resolvable.find((h) => h.regulationId === focusRegulationId)
    : undefined;
  const lead = resolvable[0];

  // A precise citation ("2001/83", "Annex 1") outranks the certificate; a label that
  // only brushes a topic word ("marketing authorisation") is better served by the
  // certificate actually held on the product.
  const preferCertificate =
    !!cert &&
    !explicit &&
    (focusRegulationId === CERTIFICATE_KEY || !lead || lead.weight < CITATION_WEIGHT);

  if (preferCertificate) return certificateDetail(CERTIFICATE_KEY, label, product, cert!, alternates);

  const chosen = explicit ?? lead;

  if (!chosen) {
    // Nothing in the catalog, the matrix or the certificate list recognises this label.
    return {
      key: label,
      kind: 'UNRESOLVED',
      label,
      reference: label,
      verdict: 'Not assessed for this product',
      verdictTone: 'neutral',
      verdictText:
        'This entry is recorded on the product but does not resolve to an instrument in the reference catalog, so the engine has produced no applicability verdict for it. It is shown as written on the product record.',
      meta: [
        { label: 'Recorded on', value: product.name },
        { label: 'Product reference', value: product.reference || product.sku || '—', mono: true },
        { label: 'Source', value: 'Product record — compliance list' },
      ],
      signals: productSignals(product),
      reason:
        'No catalog entry matched this text. Either the instrument is outside the current catalog scope, or the entry is a free-text note rather than a citation. Assign it from the reference library to have the engine assess it.',
      evidence: [],
      obligations: [],
      gapIds: [],
      changeEventIds: [],
      alternates,
    };
  }

  const regulationId = chosen.regulationId;
  const meta = META_BY_ID.get(regulationId);
  const mref = refs.find((r) => r.regulation_id === regulationId);
  const vcheck = versionCheckFor(productKey, regulationId);

  const tier = (mref?.legal_status ?? meta?.legal_status ?? 'INGESTIBLE') as LegalTier;
  const reference = meta?.reference ?? mref?.reference ?? label;
  const shortCode = meta?.short_code ?? mref?.short_code;

  const versionHeld = mref?.tenant_version_held ?? vcheck?.held;
  const versionInForce = mref?.current_version ?? vcheck?.in_force ?? meta?.current_version;
  const versionStatus = mref?.version_status ?? vcheck?.status;
  const drift = mref?.version_drift_days;

  const outdated = versionStatus === 'OUTDATED';
  const presentation = verdictPresentation(mref?.verdict);

  const metaCells: MetaCell[] = [
    { label: 'Issuing authority', value: meta?.authority ?? '—' },
    { label: 'Instrument type', value: meta?.type ?? '—' },
    { label: 'Jurisdiction', value: meta?.jurisdiction ?? meta?.country_region ?? '—' },
    { label: 'Category', value: meta?.category ?? '—' },
    { label: 'Version in force', value: versionInForce ?? '—' },
    {
      label: 'Version on this product',
      value: versionHeld
        ? outdated && drift
          ? `${versionHeld} — ${drift} days behind`
          : versionHeld
        : 'Not assigned',
      tone: outdated ? 'warn' : versionHeld ? 'default' : 'bad',
    },
    { label: 'Legal tier', value: TIER_LABEL[tier] },
    { label: 'Engine capability', value: meta?.engine_capability ?? TIER_CAPABILITY[tier] },
    {
      label: 'Source',
      value: [meta?.source, meta?.source_url].filter(Boolean).join(' · ') || '—',
    },
    { label: 'Role on this product', value: mref?.role ?? '—' },
    {
      label: 'Assignment',
      value: mref
        ? [
            mref.assignment_source === 'ONBOARDING'
              ? 'Inherited from the company profile'
              : mref.assignment_source === 'ENGINE'
                ? 'Detected by the engine'
                : mref.assignment_source
                  ? `Assigned by ${mref.assignment_source.toLowerCase()}`
                  : 'Assigned',
            formatDate(mref.assigned_at ?? mref.detected_at),
          ]
            .filter(Boolean)
            .join(' · ')
        : 'Not assigned to this product',
    },
    { label: 'Reference id', value: regulationId, mono: true },
  ];

  const evidence: EvidenceItem[] = (mref?.evidence ?? []).map((e) => {
    if (e.type === 'product_document')
      return { kind: 'document', label: e.doc_id ?? 'Product document', detail: e.ref };
    if (e.type === 'product_attribute')
      return {
        kind: 'attribute',
        label: `Product attribute — ${e.field ?? 'unknown field'}`,
        detail: e.value,
      };
    return { kind: 'external', label: e.type ?? 'Signal', detail: e.value ?? e.ref };
  });

  const obligations: Obligation[] = (mref?.key_obligations ?? []).map((o) => {
    const m = o.match(/^\s*(§?[^—–-]{1,28}?)\s*[—–-]\s*(.+)$/);
    return m ? { clause: m[1].trim(), text: m[2].trim() } : { clause: '—', text: o };
  });

  const isRuledOut = mref?.verdict === 'NOT_APPLICABLE';
  const reason =
    mref?.why_applicable ??
    mref?.reason ??
    (meta
      ? `The engine has no assessment recorded for ${reference} against ${product.name}. The instrument is in the catalog, so it can be assigned and assessed — the attributes below are what the assessment would run against.`
      : 'No assessment recorded.');

  let verdictText: string;
  if (isRuledOut) {
    verdictText =
      'Recorded, not hidden. A reference the engine ruled out keeps its reasoning on file so a reviewer can challenge the decision instead of wondering whether it was ever considered.';
  } else if (mref?.condition) {
    verdictText = mref.condition;
  } else if (outdated) {
    verdictText = `Applicable at high confidence — the problem is the edition. The product record holds ${versionHeld}, ${
      drift ? `${drift} days ` : ''
    }behind the text in force, so obligations added since have never entered scope.`;
  } else if (mref) {
    verdictText = `Assessed as ${presentation.verdict.toLowerCase()} for ${product.name} on the attributes below.`;
  } else {
    verdictText =
      'This instrument is in the reference catalog but carries no engine verdict for this product yet.';
  }

  return {
    key: regulationId,
    kind: mref ? 'ASSESSED' : 'CATALOG_ONLY',
    label,
    reference,
    shortCode,
    regulationId,
    title: meta?.title,
    verdict: presentation.verdict,
    verdictTone: presentation.tone,
    verdictText,
    condition: mref?.condition,
    applicabilityScore: mref?.applicability_score,
    confidenceScore: mref?.confidence_score,
    impact: mref?.impact_level,
    role: mref?.role,
    tier,
    tierLabel: TIER_LABEL[tier],
    engineCapability: meta?.engine_capability ?? TIER_CAPABILITY[tier],
    versionHeld,
    versionInForce,
    versionStatus,
    versionDriftDays: drift,
    versionNote: vcheck?.note ?? vcheck?.legal_note,
    meta: metaCells,
    signals: productSignals(product),
    reason,
    evidence,
    obligations,
    gapIds: mref?.linked_gaps ?? [],
    changeEventIds: mref?.linked_change_events ?? [],
    engineNote: mref?.engine_note,
    assessedAt: formatDate(productKey ? MATRIX.by_product[productKey]?.last_applicability_run : undefined),
    assignmentSource: mref?.assignment_source,
    alternates,
  };
}

/** True when the engine has something to say about this label. */
export function hasAssessment(product: ApplicabilityProduct, label: string): boolean {
  const refs = referencesFor(matrixProductKey(product));
  return anchorHits(label).some((h) => refs.some((r) => r.regulation_id === h.regulationId));
}
