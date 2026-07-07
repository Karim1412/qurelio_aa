import {
  Injectable, NotFoundException, Logger, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import { Readable } from 'stream';
import * as ExcelJS from 'exceljs';
import { PDFFont } from 'pdf-lib';
import {
  createBrandedPdfWriter,
  brandedDrawBlock,
  brandedSectionBar,
  finalizeBrandedPdf,
} from '../common/pdf-brand-layout';
import { Evaluation, EvaluationStatus } from '../database/entities/evaluation.entity';
import { NonConformity, NCClassification, NCSource } from '../database/entities/non-conformity.entity';
import { CompanyActivityService } from '../company-activity/company-activity.service';

type ClauseRow = {
  clauseReference: string;
  clauseTitle: string;
  clauseSummary: string;
  clauseTextExcerpt: string;
  verdict: string;
  confidence: number;
  supportingEvidence: { documentId: string; excerpt: string; similarityScore: number; sourceLabel?: string }[];
  gaps: string[];
  suggestions: string[];
  legacyScore?: number;
  legacyStatus?: string;
  override?: { verdict: string; userId: string; reason: string; at: string };
  reasoning?: string;
  requirementElements?: { element: string; evidence_refs: number[]; status: string; notes: string }[];
  evidenceAssessment?: { chunk_id: number; relevance: string; supports: boolean; covers_elements: string[] }[];
};

type ClauseLookupEntry = { title: string; summary: string };

/** Frozen at evaluation create for Qleer-style reports (standard / product / company). */
type ReportPack = {
  standard: { reference: string; title: string; version: string; effectiveDate: string };
  product: {
    name: string;
    reference: string;
    revision: string;
    category: string;
    subCategory: string;
    tradeMark: string;
    created: string;
    environment: string;
    users: string;
    tempHumidity: string;
    ipRating: string;
    description: string;
  };
  company: { companyName: string; address: string; email: string; phone: string };
  initiator: { firstName: string; lastName: string; email: string };
};

type EvaluationExportBundle = {
  ev: Evaluation;
  lookup: Map<string, ClauseLookupEntry>;
  docFileName: string;
  standardTitleMeta: string;
  isoFromDoc: string;
  filenameBase: string;
  reportRef: string;
  reportPack: ReportPack;
};

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    @InjectRepository(Evaluation) private evalRepo: Repository<Evaluation>,
    @InjectRepository(NonConformity) private ncRepo: Repository<NonConformity>,
    private cfg: ConfigService,
    @InjectQueue('evaluation') private evalQueue: Queue,
    private companyActivity: CompanyActivityService,
  ) {}

  private get ragUrl() {
    return (this.cfg.get('RAG_SERVICE_URL', 'http://rag-service:8000') || '').replace(/\/$/, '');
  }

  private get notificationUrl() {
    return (this.cfg.get('NOTIFICATION_SERVICE_URL', 'http://notification-service:3004') || '').replace(/\/$/, '');
  }

  /** Token for notification-service internal routes (accepts NOTIFICATION or DOCUMENT on that service). */
  private get internalToken() {
    return (this.cfg.get('NOTIFICATION_INTERNAL_TOKEN') || this.cfg.get('DOCUMENT_INTERNAL_TOKEN') || '').trim();
  }

  /** document-service internal routes validate DOCUMENT_INTERNAL_TOKEN only (not NOTIFICATION_INTERNAL_TOKEN). */
  private get documentInternalToken() {
    return (this.cfg.get<string>('DOCUMENT_INTERNAL_TOKEN') || '').trim();
  }

  private get documentServiceUrl() {
    return (this.cfg.get('DOCUMENT_SERVICE_URL', 'http://document-service:3003') || '').replace(/\/$/, '');
  }

  private get authServiceUrl() {
    return (this.cfg.get('AUTH_SERVICE_URL', 'http://auth-service:3002') || '').replace(/\/$/, '');
  }

  /** One segment of export basename: spaces → `_`, illegal path chars → `-`, capped length. */
  private slugExportSegment(raw: string, maxLen: number): string {
    let s = (raw || '').trim();
    if (!s) return '';
    s = s.replace(/[/\\?%*|"<>]/g, '-').replace(/:/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/-+/g, '-');
    s = s.replace(/^_+|_+$/g, '').replace(/^-+|-+$/g, '');
    if (!s) return '';
    return s.slice(0, maxLen).replace(/[_-]+$/, '');
  }

  private normClauseLookupKey(clauseRef: string): string {
    return (clauseRef || '')
      .trim()
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  private looksLikeUuid(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((s || '').trim());
  }

  /**
   * Human-facing product label — never a UUID (snapshots sometimes misused `product` for id).
   */
  private resolveHumanProductName(
    snap: Record<string, unknown>,
    meta: Record<string, unknown>,
    reportPack?: ReportPack | null,
    folderName?: string,
    docName?: string,
  ): string {
    const cands = [
      snap.productName,
      meta.productName,
      reportPack?.product?.name,
      folderName,
      docName,
    ];
    for (const c of cands) {
      const s = typeof c === 'string' ? c.trim() : '';
      if (!s || s === '—' || this.looksLikeUuid(s)) continue;
      return s;
    }
    return 'Product';
  }

  /** Long standard label for reports (title / library name before short norm code). */
  private resolveStandardDisplayName(
    ev: Evaluation,
    snap: Record<string, unknown>,
    meta: Record<string, unknown>,
    enrich: { standardTitleMeta: string; docFileName: string; isoFromDoc: string },
    reportPack?: ReportPack | null,
  ): string {
    const fromPack = reportPack?.standard?.title && reportPack.standard.title !== '—'
      ? reportPack.standard.title
      : '';
    const chain = [
      fromPack,
      meta.standardTitle,
      meta.standardName,
      enrich.standardTitleMeta,
      enrich.docFileName,
      meta.standardReference,
      meta.isoStandard,
      ev.isoStandard,
      enrich.isoFromDoc,
    ];
    for (const c of chain) {
      const s = typeof c === 'string' ? c.trim() : '';
      if (s) return s;
    }
    return 'Standard';
  }

  /** PDF/Excel "Report reference": `Standard name · Product name · YYYY-MM-DD`. */
  private buildReportReference(
    ev: Evaluation,
    snap: Record<string, unknown>,
    meta: Record<string, unknown>,
    enrich: { standardTitleMeta: string; docFileName: string; isoFromDoc: string },
    reportPack: ReportPack,
  ): string {
    const std = this.resolveStandardDisplayName(ev, snap, meta, enrich, reportPack);
    const prod = this.resolveHumanProductName(snap, meta, reportPack, reportPack.product.name !== '—' ? reportPack.product.name : undefined, undefined);
    const dSrc = ev.completedAt ?? ev.createdAt;
    const ds = dSrc ? new Date(dSrc).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    return `${std} · ${prod} · ${ds}`;
  }

  /**
   * Download basename: `{standard}__{product}__{YYYY-MM-DD}__{8-hex}` (matches report ref + unique suffix).
   */
  private exportFilenameBase(
    ev: Evaluation,
    enrich: { standardTitleMeta: string; docFileName: string; isoFromDoc: string },
    reportPack: ReportPack,
  ): string {
    const snap = (ev.requestSnapshot ?? {}) as Record<string, unknown>;
    const meta = (snap.evaluationMetadata as Record<string, unknown> | undefined) ?? {};
    const std = this.resolveStandardDisplayName(ev, snap, meta, enrich, reportPack);
    const prod = this.resolveHumanProductName(
      snap,
      meta,
      reportPack,
      reportPack.product.name !== '—' ? reportPack.product.name : undefined,
      undefined,
    );
    const stdSlug = this.slugExportSegment(std, 88) || 'standard';
    const prodSlug = this.slugExportSegment(prod, 56) || 'product';
    const dSrc = ev.completedAt ?? ev.createdAt;
    const d = dSrc ? new Date(dSrc) : new Date();
    const ds = d.toISOString().slice(0, 10);
    const shortId = ev.id.replace(/-/g, '').slice(0, 8).toLowerCase();
    return [stdSlug, prodSlug, ds, shortId].join('__');
  }

  private truncateForExport(text: string, max: number): string {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
  }

  /** Truncate without collapsing newlines (clause bodies, long norm text). */
  private clipExportText(text: string, max: number): string {
    const t = (text || '').trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
  }

  private composeDetailedSummary(content: string, bullets: string[]): string {
    const c = (content || '').trim();
    const bs = (bullets || [])
      .filter((b): b is string => typeof b === 'string' && String(b).trim().length > 0)
      .map((b) => String(b).trim());
    const parts: string[] = [];
    if (c) parts.push(c);
    if (bs.length) parts.push(bs.map((b) => `• ${b}`).join('\n'));
    return parts.join('\n\n').trim();
  }

  private deriveClauseTitle(clauseNumber: string, heading: string): string {
    const h = (heading || '').trim();
    const cn = (clauseNumber || '').trim();
    if (cn && h) {
      try {
        const esc = cn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const stripped = h.replace(new RegExp(`^${esc}\\s*[-–—.:)]*\\s*`, 'i'), '').trim();
        if (stripped.length >= 2) return stripped;
      } catch {
        /* ignore bad regex */
      }
    }
    return h || cn || '—';
  }

  /** Map one ISO section row to one or more lookup keys (numeric clauses, Annex A, A.1, …). */
  private deriveClauseKeysFromIsoSection(clauseNumber: string, heading: string): string[] {
    const keys = new Set<string>();
    const addRaw = (raw: string) => {
      const t = (raw || '').trim();
      if (!t) return;
      keys.add(this.normClauseLookupKey(t));
    };
    const cn = (clauseNumber || '').trim();
    const h = (heading || '').trim();
    if (cn) addRaw(cn);
    const mNum = h.match(/^(\d+(?:\.\d+)*(?:\([a-z]\))?)\b/i);
    if (mNum) addRaw(mNum[1]);
    const mAx = h.match(/^Annex\s+([A-Z])\b/i);
    if (mAx) {
      addRaw(`Annex ${mAx[1]}`);
      addRaw(mAx[1]);
    }
    const mApp = h.match(/^Appendix\s+([A-Z])\b/i);
    if (mApp) {
      addRaw(`Appendix ${mApp[1]}`);
      addRaw(mApp[1]);
    }
    const mLetter = h.match(/^([A-Z]\.\d+(?:\.\d+)*)\b/);
    if (mLetter) addRaw(mLetter[1]);
    const mZ = h.match(/^([A-Z])\s+(\d+(?:\.\d+)*)\b/);
    if (mZ) addRaw(`${mZ[1]}.${mZ[2]}`);
    return [...keys];
  }

  private normClauseRefVariants(ref: string): string[] {
    const raw = (ref || '').trim();
    const keys = new Set<string>();
    const add = (s: string) => {
      const k = this.normClauseLookupKey(s);
      if (k) keys.add(k);
    };
    add(raw);
    add(raw.replace(/[–—−]/g, '-'));
    const deParen = raw.replace(/\([^)]*\)/g, '').trim();
    if (deParen && deParen !== raw) add(deParen);
    return [...keys];
  }

  private parentClauseKeys(ref: string): string[] {
    const base = this.normClauseLookupKey(ref.replace(/\([^)]*\)/g, ''));
    if (!base.includes('.')) return [];
    const segs = base.split('.');
    const out: string[] = [];
    for (let i = segs.length - 1; i >= 1; i--) {
      const p = segs.slice(0, i).join('.');
      if (p && p !== base) out.push(p);
    }
    return out;
  }

  private pickClauseEnhancement(lookup: Map<string, ClauseLookupEntry>, clauseRef: string): ClauseLookupEntry {
    const tryKeys = [...this.normClauseRefVariants(clauseRef), ...this.parentClauseKeys(clauseRef)];
    for (const k of tryKeys) {
      const hit = lookup.get(k);
      if (hit) return hit;
    }
    const k = this.normClauseLookupKey(clauseRef);
    const noAnnex = k.replace(/^annex/, '');
    if (noAnnex !== k) {
      const a = lookup.get(noAnnex);
      if (a) return a;
    }
    return { title: '', summary: '' };
  }

  private str(v: unknown): string {
    if (typeof v === 'string') return v.trim();
    if (v == null) return '';
    return String(v).trim();
  }

  private reportPackPlaceholder(s: string): boolean {
    const t = (s || '').trim();
    return !t || t === '—';
  }

  /** Prefer snapshot initiator; fall back to evaluation row (email / user id). */
  private formatPreparedBy(ev: Evaluation, reportPack: ReportPack): string {
    const fn = this.reportPackPlaceholder(reportPack.initiator.firstName) ? '' : reportPack.initiator.firstName.trim();
    const ln = this.reportPackPlaceholder(reportPack.initiator.lastName) ? '' : reportPack.initiator.lastName.trim();
    const em = this.reportPackPlaceholder(reportPack.initiator.email) ? '' : reportPack.initiator.email.trim();
    const name = `${fn} ${ln}`.replace(/\s+/g, ' ').trim();
    if (name && em) return `${name} (${em})`;
    if (name) return name;
    if (em) return em;
    const ie = (ev.initiatorEmail || '').trim();
    if (ie) return ie;
    const uid = (ev.initiatedBy || '').trim();
    if (uid) return `User ID: ${uid}`;
    return '—';
  }

  /** Product folder / file registration date from report pack (`created` ISO day or datetime). */
  private formatProductFileAddedDisplay(reportPack: ReportPack): string {
    const raw = this.str(reportPack.product.created);
    if (!raw || raw === '—') return '—';
    const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'medium' });
  }

  private emptyReportPack(): ReportPack {
    const dash = '—';
    return {
      standard: { reference: dash, title: dash, version: dash, effectiveDate: dash },
      product: {
        name: dash,
        reference: dash,
        revision: dash,
        category: dash,
        subCategory: dash,
        tradeMark: dash,
        created: dash,
        environment: dash,
        users: dash,
        tempHumidity: dash,
        ipRating: dash,
        description: dash,
      },
      company: { companyName: dash, address: dash, email: dash, phone: dash },
      initiator: { firstName: dash, lastName: dash, email: dash },
    };
  }

  private async fetchStructuredDoc(
    companyId: string,
    documentId: string,
  ): Promise<Record<string, unknown> | null> {
    const base = this.documentServiceUrl;
    const token = this.documentInternalToken;
    if (!base || !documentId) return null;
    try {
      const r = await axios.get(
        `${base}/api/documents/internal/structured/${encodeURIComponent(documentId)}`,
        {
          params: { company_id: companyId },
          headers: token ? { 'X-Internal-Token': token } : {},
          timeout: 25000,
          validateStatus: () => true,
        },
      );
      if (r.status >= 400 || !r.data) return null;
      return r.data as Record<string, unknown>;
    } catch (e: any) {
      this.logger.warn(`structured doc fetch: ${e?.message ?? e}`);
      return null;
    }
  }

  private async fetchAuthCompanyDisplayName(companyId: string): Promise<string | null> {
    const base = this.authServiceUrl;
    const token = this.documentInternalToken;
    if (!base || !token || !this.str(companyId)) return null;
    try {
      const r = await axios.get(
        `${base}/api/internal/companies/${encodeURIComponent(companyId)}/display-name`,
        {
          headers: { 'X-Internal-Token': token },
          timeout: 12000,
          validateStatus: () => true,
        },
      );
      if (r.status !== 200 || typeof r.data?.name !== 'string') return null;
      const n = this.str(r.data.name);
      return n || null;
    } catch (e: any) {
      this.logger.warn(`auth company display-name: ${e?.message ?? e}`);
      return null;
    }
  }

  /** When snapshot company is empty, fill from evaluationMetadata or auth-service. */
  private async enrichReportPackCompany(
    companyId: string,
    reportPack: ReportPack,
    snap: Record<string, unknown>,
  ): Promise<ReportPack> {
    const cur = this.str(reportPack.company.companyName);
    if (cur && cur !== '—') return reportPack;
    const meta = (snap.evaluationMetadata as Record<string, unknown> | undefined) ?? {};
    const rc = (snap.reportContext as Record<string, unknown> | undefined) ?? {};
    const co = (rc.company as Record<string, unknown> | undefined) ?? {};
    const fromSnap = this.str(meta.companyName) || this.str(co.companyName);
    if (fromSnap && fromSnap !== '—') {
      return { ...reportPack, company: { ...reportPack.company, companyName: fromSnap } };
    }
    const fromAuth = await this.fetchAuthCompanyDisplayName(companyId);
    if (fromAuth) {
      return { ...reportPack, company: { ...reportPack.company, companyName: fromAuth } };
    }
    return reportPack;
  }

  private buildClauseLookupFromStructuredPayload(data: Record<string, unknown> | null): {
    lookup: Map<string, ClauseLookupEntry>;
    docFileName: string;
    standardTitleMeta: string;
    isoFromDoc: string;
  } {
    const empty = (): {
      lookup: Map<string, ClauseLookupEntry>;
      docFileName: string;
      standardTitleMeta: string;
      isoFromDoc: string;
    } => ({
      lookup: new Map(),
      docFileName: '',
      standardTitleMeta: '',
      isoFromDoc: '',
    });
    if (!data) return empty();
    const extracted = data.extractedStructured as Record<string, unknown> | null | undefined;
    const sections = (extracted?.sections as Array<Record<string, unknown>> | undefined) ?? [];
    const lookup = new Map<string, ClauseLookupEntry>();
    for (const s of sections) {
      const clauseNumber = typeof s.clauseNumber === 'string' ? s.clauseNumber.trim() : '';
      const heading = typeof s.heading === 'string' ? s.heading.trim() : '';
      const content = typeof s.content === 'string' ? s.content.trim() : '';
      const bullets = Array.isArray(s.bullets)
        ? (s.bullets as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      const title = this.deriveClauseTitle(clauseNumber, heading);
      const summaryRaw = this.composeDetailedSummary(content, bullets);
      const summary = this.clipExportText(summaryRaw, 16_000);
      const keys = this.deriveClauseKeysFromIsoSection(clauseNumber, heading);
      for (const key of keys) {
        const prev = lookup.get(key);
        if (!prev || summary.length > prev.summary.length) {
          const bestTitle = !prev || title.length >= prev.title.length ? title : prev.title;
          lookup.set(key, { title: bestTitle, summary });
        }
      }
    }
    const meta = extracted?.standardMetadata as Record<string, unknown> | undefined;
    const stdTitle = typeof meta?.title === 'string' ? meta.title.trim() : '';
    const docTitle = typeof extracted?.title === 'string' ? (extracted.title as string).trim() : '';
    return {
      lookup,
      docFileName: typeof data.name === 'string' ? data.name.trim() : '',
      standardTitleMeta: stdTitle || docTitle,
      isoFromDoc: typeof data.isoStandard === 'string' ? data.isoStandard.trim() : '',
    };
  }

  private buildReportPackFromSnapshots(
    isoRaw: Record<string, unknown> | null,
    prodRaw: Record<string, unknown> | null,
    snap: Record<string, unknown>,
    isoStandardCol: string,
    createdAt: Date,
  ): ReportPack {
    const e = this.emptyReportPack();
    const meta = (snap.evaluationMetadata as Record<string, unknown> | undefined) ?? {};
    const rc = (snap.reportContext as Record<string, unknown> | undefined) ?? {};
    const extIso = (isoRaw?.extractedStructured as Record<string, unknown> | undefined) ?? {};
    const stdMeta = (extIso.standardMetadata as Record<string, unknown> | undefined) ?? {};
    const extProd = (prodRaw?.extractedStructured as Record<string, unknown> | undefined) ?? {};
    const pp = (extProd.productProfile as Record<string, unknown> | undefined) ?? {};
    const folder = (prodRaw?.productFolder as Record<string, unknown> | undefined) ?? {};
    const mergedRoot = (folder.mergedProfile as Record<string, unknown> | undefined) ?? {};
    const basic = {
      ...((pp.basicInformation as Record<string, unknown> | undefined) ?? {}),
      ...((mergedRoot.basicInformation as Record<string, unknown> | undefined) ?? {}),
    };
    const usage = {
      ...((pp.usage as Record<string, unknown> | undefined) ?? {}),
      ...((mergedRoot.usage as Record<string, unknown> | undefined) ?? {}),
    };

    const isoRef =
      this.str(meta.standardReference) ||
      this.str(isoRaw?.isoStandard) ||
      isoStandardCol ||
      this.str(stdMeta.reference) ||
      '—';
    const title =
      this.str(meta.standardTitle) ||
      this.str(meta.standardName) ||
      this.str(stdMeta.title) ||
      this.str(extIso.title) ||
      this.str(isoRaw?.name) ||
      '—';
    const eff = this.str(stdMeta.effectiveDate) || '—';
    const version =
      this.str(meta.standardVersion) ||
      this.str(meta.normVersion) ||
      this.str(stdMeta.reference) ||
      isoRef;

    const prodName = this.resolveHumanProductName(
      snap,
      meta,
      null,
      this.str(folder.name),
      typeof prodRaw?.name === 'string' ? prodRaw.name : undefined,
    );

    const catTags = Array.isArray(folder.categoryTags)
      ? (folder.categoryTags as string[]).filter(Boolean).join(', ')
      : '';

    const desc =
      this.str(pp.qualitySpecificationNarrative) ||
      this.str(pp.generalDescription) ||
      this.str(pp.regulatoryNotes) ||
      this.str(pp.technicalCharacteristics) ||
      this.str(mergedRoot.qualitySpecificationNarrative) ||
      this.str(mergedRoot.generalDescription) ||
      '—';

    e.standard = { reference: isoRef, title, version: version || '—', effectiveDate: eff };
    e.product = {
      name: prodName,
      reference: this.str(basic.reference) || this.str(folder.reference) || '—',
      revision: this.str(basic.revision) || this.str(folder.revision) || '—',
      category: this.str(basic.category) || catTags || '—',
      subCategory: this.str(basic.subCategory) || '—',
      tradeMark: this.str(basic.tradeMark) || '—',
      created: folder.createdAt
        ? new Date(String(folder.createdAt)).toISOString().slice(0, 10)
        : createdAt.toISOString().slice(0, 10),
      environment: this.str(usage.environment) || '—',
      users: this.str(usage.users) || '—',
      tempHumidity: this.str(usage.tempHumidity) || '—',
      ipRating: this.str(usage.ipRating) || '—',
      description: desc,
    };

    const co = (rc.company as Record<string, unknown> | undefined) ?? {};
    const ini = (rc.initiator as Record<string, unknown> | undefined) ?? {};
    e.company = {
      companyName: this.str(co.companyName) || this.str(meta.companyName) || '—',
      address: this.str(co.address) || this.str(co.field) || '—',
      email: this.str(co.email) || '—',
      phone: this.str(co.phone) || '—',
    };
    e.initiator = {
      firstName: this.str(ini.firstName) || '—',
      lastName: this.str(ini.lastName) || '—',
      email: this.str(ini.email) || '—',
    };
    return e;
  }

  private readValidReportPack(snap: Record<string, unknown>): ReportPack | null {
    const rp = snap.reportPack;
    if (!rp || typeof rp !== 'object') return null;
    const o = rp as Record<string, unknown>;
    const std = o.standard;
    if (!std || typeof std !== 'object') return null;
    const ref = this.str((std as Record<string, unknown>).reference);
    if (!ref || ref === '—') return null;
    return rp as unknown as ReportPack;
  }

  private conformityStatus(eff: string): string {
    const u = (eff || '').toUpperCase();
    if (u === 'SATISFIED') return 'PASS';
    if (u === 'PARTIALLY_SATISFIED') return 'PART';
    if (u === 'NOT_SATISFIED') return 'FAIL';
    return '—';
  }

  private verdictShort(eff: string): string {
    const u = (eff || '').toUpperCase();
    if (u === 'SATISFIED') return 'P';
    if (u === 'PARTIALLY_SATISFIED') return 'M';
    if (u === 'NOT_SATISFIED') return 'F';
    return '—';
  }

  private extractApplicableIf(text: string): string {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    const m = t.match(/\bIF:?\s+(.+)/i);
    return m ? m[1].trim().slice(0, 800) : '—';
  }

  private extractNormRefs(text: string): string {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    const hits = t.match(/\b(?:IEC|ISO|EN|NF|ANSI|IEEE)\s*[\d-]+(?::\d{4})?(?:\+A\d+:\d{4})?/gi);
    return hits?.length ? [...new Set(hits)].join('; ').slice(0, 800) : '—';
  }

  private isStructuralClauseRow(r: ClauseRow, enh: ClauseLookupEntry): boolean {
    const noBody = !this.str(enh.summary) && !this.str(r.clauseTextExcerpt);
    const noEv = !(r.supportingEvidence || []).length;
    return noBody && noEv;
  }

  /** Remove UUIDs, document markers, page numbers, path-encoded text, and JSON noise. */
  private cleanEvidenceText(text: string): string {
    let s = (text || '').trim();
    s = s.replace(/\\n/g, '\n');

    // Remove entire lines that start with a UUID (with or without trailing whitespace/numbers)
    s = s.split('\n').map(line => {
      let l = line.trim();
      // Strip leading UUIDs: "aca03ef5-...: 5" or "aca03ef5-...:" or just "aca03ef5-..."
      l = l.replace(/^\[?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]?,?\s*[:;]?\s*\d*[\s:;,]*/, '').trim();
      // Strip UUIDs embedded mid-line as well
      l = l.replace(/\[?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]?,?\s*[:;]?\s*/gi, '').trim();
      // Remove path-encoded text like "/c76/c101/c32/..."
      l = l.replace(/\/[a-z0-9]{2,4}(\/[a-z0-9]{2,4})+\s*/gi, '').trim();
      // Remove isolated numbers like "4/11", "4/ 9", "(1) 6", "8,8 11"
      l = l.replace(/^[\d\s,()/-]+$/, '').trim();
      // Remove lines that start with a digit/section reference that is just a number (page numbers)
      l = l.replace(/^\d{1,2}\/\d{1,2}\s*$/, '').trim();
      return l;
    }).filter(line => {
      const t = line.trim();
      if (!t) return false;
      // Skip if line is just punctuation/numbers
      if (/^[\d\s,;:.()/\-]+$/.test(t)) return false;
      // Skip if very short (less than 3 meaningful chars)
      if (t.replace(/[\s\d]/g, '').length < 2) return false;
      return true;
    }).join('\n');

    // Collapse multiple newlines to one
    s = s.replace(/\n{3,}/g, '\n\n');
    s = s.trim();
    return s;
  }

  /** Deduplicate evidence chunks by text content and filter empty ones. */
  private deduplicateEvidence(chunks: { sourceLabel?: string; documentId?: string; excerpt: string }[]): { sourceLabel?: string; documentId?: string; excerpt: string }[] {
    const seen = new Set<string>();
    const out: typeof chunks = [];
    for (const c of chunks) {
      const cleaned = this.cleanEvidenceText(c.excerpt || '');
      if (!cleaned || cleaned.length < 10) continue;
      const firstLine = cleaned.split('\n')[0].trim().slice(0, 80);
      const key = firstLine.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out.slice(0, 5);
  }

  private buildJustification(r: ClauseRow, eff: string, structural: boolean): string {
    if (structural) {
      return 'N/A: Clause de titre, non normative.';
    }
    const u = (eff || '').toUpperCase();
    let statusLabel: string;
    if (u === 'SATISFIED') {
      statusLabel = 'PASS';
    } else if (u === 'NOT_SATISFIED') {
      statusLabel = 'FAIL';
    } else if (u === 'PARTIALLY_SATISFIED') {
      statusLabel = 'Missing info';
    } else {
      statusLabel = 'N/A';
    }
    const parts: string[] = [];
    const evLines = (r.supportingEvidence || []).slice(0, 6).map(
      (x) => {
        const src = x.sourceLabel || x.documentId || '';
        const txt = this.cleanEvidenceText(x.excerpt || '');
        return src ? `${src}: ${txt}` : txt;
      },
    );
    if (evLines.length) parts.push(evLines.join(' | '));
    if ((r.gaps || []).length) parts.push(`Gaps: ${(r.gaps || []).join('; ')}`);
    if ((r.suggestions || []).length) parts.push(`Suggestions: ${(r.suggestions || []).join('; ')}`);
    if (r.override) parts.push(`Override: ${r.override.verdict} — ${r.override.reason}`);
    const body = parts.join('\n') || this.str(r.clauseTextExcerpt).slice(0, 600);
    return `${statusLabel}: ${body}`.slice(0, 8000);
  }

  private async loadEvaluationExportBundle(id: string, companyId: string): Promise<EvaluationExportBundle> {
    const ev = await this.getOne(id, companyId);
    const snap = (ev.requestSnapshot ?? {}) as Record<string, unknown>;
    const [isoRaw, prodRaw] = await Promise.all([
      this.fetchStructuredDoc(companyId, ev.isoDocumentId),
      this.fetchStructuredDoc(companyId, ev.productDocumentId),
    ]);
    const { lookup, docFileName, standardTitleMeta, isoFromDoc } = this.buildClauseLookupFromStructuredPayload(isoRaw);
    let reportPack = this.readValidReportPack(snap);
    if (!reportPack) {
      reportPack = this.buildReportPackFromSnapshots(
        isoRaw,
        prodRaw,
        snap,
        ev.isoStandard,
        ev.createdAt ? new Date(ev.createdAt) : new Date(),
      );
    } else {
      const pc = this.str(reportPack.product.created);
      if (!pc || pc === '—') {
        const merged = this.buildReportPackFromSnapshots(
          isoRaw,
          prodRaw,
          snap,
          ev.isoStandard,
          ev.createdAt ? new Date(ev.createdAt) : new Date(),
        );
        reportPack = { ...reportPack, product: { ...reportPack.product, created: merged.product.created } };
      }
    }
    reportPack = await this.enrichReportPackCompany(companyId, reportPack, snap);
    const enrich = { docFileName, standardTitleMeta, isoFromDoc };
    const meta = (snap.evaluationMetadata as Record<string, unknown> | undefined) ?? {};
    const filenameBase = this.exportFilenameBase(ev, enrich, reportPack);
    const reportRef = this.buildReportReference(ev, snap, meta, enrich, reportPack);
    return { ev, lookup, docFileName, standardTitleMeta, isoFromDoc, filenameBase, reportRef, reportPack };
  }

  /** STD-004: only Active, Ready ISO standards may be used in evaluations. */
  private async assertIsoDocumentEligibleForEvaluation(companyId: string, isoDocumentId: string): Promise<void> {
    const base = this.documentServiceUrl;
    if (!base) {
      this.logger.warn('DOCUMENT_SERVICE_URL not set; skipping ISO activation check');
      return;
    }
    const token = this.documentInternalToken;
    try {
      const r = await axios.get(
        `${base}/api/documents/internal/eval-check/${encodeURIComponent(isoDocumentId)}`,
        {
          params: { company_id: companyId },
          headers: token ? { 'X-Internal-Token': token } : {},
          timeout: 20000,
          validateStatus: () => true,
        },
      );
      if (r.status >= 400 || !r.data?.ok) {
        const reason = r.data?.reason ?? `HTTP_${r.status}`;
        throw new BadRequestException(
          `This standard cannot be used for evaluation (${reason}). Activate it under Documents → Standard documents.`,
        );
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      this.logger.warn(`ISO eval eligibility check failed: ${e?.message ?? e}`);
      throw new BadRequestException(
        'Could not verify the selected standard. Ensure the document service is reachable and the standard is activated.',
      );
    }
  }

  private verdictWeight(v: string): number {
    const u = (v || '').toUpperCase();
    if (u === 'SATISFIED') return 1;
    if (u === 'PARTIALLY_SATISFIED') return 0.5;
    return 0;
  }

  private effectiveVerdict(row: ClauseRow): string {
    return row.override?.verdict ?? row.verdict;
  }

  /**
   * EVAL-004: weight by exact clause id, wildcard key `4.*`, section key `4` (matches 4.x), or `group:4.1`.
   * When multiple patterns match, the most specific (longest winning prefix) wins.
   */
  resolveClauseWeight(clauseRef: string, clauseWeights: Record<string, number> | null | undefined): number {
    if (!clauseWeights || !Object.keys(clauseWeights).length) return 1;
    const ref = clauseRef || '';
    const direct = clauseWeights[ref];
    if (direct != null && !Number.isNaN(Number(direct))) return Number(direct);

    let best = -1;
    let w = 1;
    for (const [key, raw] of Object.entries(clauseWeights)) {
      const weight = Number(raw);
      if (Number.isNaN(weight)) continue;
      let spec = -1;
      if (key.endsWith('.*')) {
        const p = key.slice(0, -2);
        if (ref === p || ref.startsWith(`${p}.`)) spec = p.length;
      } else if (key.startsWith('group:')) {
        const g = key.slice('group:'.length);
        if (ref === g || ref.startsWith(`${g}.`)) spec = 1000 + g.length;
      } else if (!key.includes('.')) {
        if (ref === key || ref.startsWith(`${key}.`)) spec = key.length;
      }
      if (spec > best) {
        best = spec;
        w = weight;
      }
    }
    return best >= 0 ? w : 1;
  }

  computeWeightedScore(rows: ClauseRow[], clauseWeights: Record<string, number> | null): number {
    if (!rows?.length) return 0;
    if (clauseWeights && Object.keys(clauseWeights).length) {
      let tw = 0;
      let acc = 0;
      for (const r of rows) {
        const w = this.resolveClauseWeight(r.clauseReference, clauseWeights);
        tw += w;
        acc += w * this.verdictWeight(this.effectiveVerdict(r));
      }
      return tw ? Math.round((100 * acc) / tw * 100) / 100 : 0;
    }
    const acc = rows.reduce((s, r) => s + this.verdictWeight(this.effectiveVerdict(r)), 0);
    return Math.round((100 * acc) / rows.length * 100) / 100;
  }

  private normalizeResults(raw: any[]): ClauseRow[] {
    return (raw || []).map((r: any) => ({
      clauseReference: r.clause_reference ?? r.clauseReference,
      clauseTitle: r.clause_title ?? r.clauseTitle ?? '',
      clauseSummary: r.clause_summary ?? r.clauseSummary ?? '',
      clauseTextExcerpt: r.clause_text_excerpt ?? r.clauseTextExcerpt ?? '',
      verdict: r.verdict,
      confidence: typeof r.confidence === 'number' ? r.confidence : parseFloat(r.confidence) || 0,
      supportingEvidence: (r.supporting_evidence ?? r.supportingEvidence ?? []).map((e: any) => ({
        documentId: e.document_id ?? e.documentId,
        excerpt: e.excerpt ?? '',
        similarityScore: e.similarity_score ?? e.similarityScore ?? 0,
        sourceLabel: e.source_label ?? e.sourceLabel,
      })),
      gaps: r.gaps ?? [],
      suggestions: r.suggestions ?? [],
      legacyScore: r.legacy_score ?? r.legacyScore,
      legacyStatus: r.legacy_status ?? r.legacyStatus,
      override: r.override,
      reasoning: r.reasoning ?? '',
      requirementElements: r.requirementElements ?? r.requirement_elements ?? [],
      evidenceAssessment: r.evidenceAssessment ?? r.evidence_assessment ?? [],
    }));
  }

  private buildNcDrafts(rows: ClauseRow[], ev: Evaluation): Record<string, unknown>[] {
    return rows
      .filter((r) => this.effectiveVerdict(r) === 'NOT_SATISFIED')
      .map((r) => ({
        clauseReference: r.clauseReference,
        title: `NC draft — ${r.clauseReference}`,
        description: (r.gaps && r.gaps.length ? r.gaps : ['Gap vs standard requirement']).join('; '),
        classification: NCClassification.MAJOR,
        isoClause: r.clauseReference,
        isoStandard: ev.isoStandard,
      }));
  }

  async create(
    companyId: string,
    userId: string,
    userEmail: string | undefined,
    dto: {
      isoDocumentId: string;
      productDocumentId: string;
      isoStandard: string;
      evidenceDocumentIds?: string[];
      scoringMethod?: string;
      clauseWeights?: Record<string, number>;
      productName?: string;
      evaluationMetadata?: Record<string, unknown>;
      reportContext?: Record<string, unknown>;
    },
  ): Promise<{ job_id: string; evaluationId: string; status: string; message: string }> {
    const evidenceIds = dto.evidenceDocumentIds?.length
      ? dto.evidenceDocumentIds
      : [dto.productDocumentId];

    const meta = (dto.evaluationMetadata ?? {}) as Record<string, unknown>;
    let productNameTop =
      dto.productName ??
      (typeof meta.productName === 'string' ? meta.productName.trim() : null) ??
      null;
    if (productNameTop && this.looksLikeUuid(productNameTop)) productNameTop = null;

    const requestSnapshot: Record<string, unknown> = {
      isoDocumentId: dto.isoDocumentId,
      productDocumentId: dto.productDocumentId,
      isoStandard: dto.isoStandard,
      evidenceDocumentIds: evidenceIds,
      scoringMethod: dto.scoringMethod ?? 'AI_AUTOMATIC',
      clauseWeights: dto.clauseWeights ?? null,
      productName: productNameTop,
      evaluationMetadata: dto.evaluationMetadata ?? null,
      reportContext: dto.reportContext ?? null,
    };

    await this.assertIsoDocumentEligibleForEvaluation(companyId, dto.isoDocumentId);

    try {
      const [isoRaw, prodRaw] = await Promise.all([
        this.fetchStructuredDoc(companyId, dto.isoDocumentId),
        this.fetchStructuredDoc(companyId, dto.productDocumentId),
      ]);
      const reportPack = this.buildReportPackFromSnapshots(
        isoRaw,
        prodRaw,
        requestSnapshot,
        dto.isoStandard,
        new Date(),
      );
      requestSnapshot.reportPack = reportPack;
      if (!requestSnapshot.productName && reportPack.product?.name && reportPack.product.name !== '—') {
        requestSnapshot.productName = reportPack.product.name;
      }
    } catch (e: any) {
      this.logger.warn(`reportPack at create: ${e?.message ?? e}`);
    }

    const ev = this.evalRepo.create({
      companyId,
      initiatedBy: userId,
      initiatorEmail: userEmail ?? null,
      status: EvaluationStatus.QUEUED,
      isoDocumentId: dto.isoDocumentId,
      isoStandard: dto.isoStandard,
      productDocumentId: dto.productDocumentId,
      evidenceDocumentIds: evidenceIds,
      scoringMethod: dto.scoringMethod ?? 'AI_AUTOMATIC',
      clauseWeights: dto.clauseWeights ?? null,
      requestSnapshot: requestSnapshot as any,
    });
    await this.evalRepo.save(ev);

    await this.evalQueue.add(
      'run',
      { evaluationId: ev.id },
      {
        removeOnComplete: true,
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
      },
    );

    return {
      job_id: ev.id,
      evaluationId: ev.id,
      status: 'Queued',
      message: 'Evaluation queued',
    };
  }

  async runEvaluationJob(evaluationId: string): Promise<void> {
    await this.evalRepo.update(evaluationId, { status: EvaluationStatus.PROCESSING, startedAt: new Date() });
    const ev = await this.evalRepo.findOne({ where: { id: evaluationId } });
    if (!ev) {
      this.logger.error(`Evaluation ${evaluationId} not found`);
      return;
    }

    try {
      const res = await axios.post(
        `${this.ragUrl}/api/evaluate`,
        {
          evaluation_id: ev.id,
          company_id: ev.companyId,
          iso_document_id: ev.isoDocumentId,
          product_document_id: ev.productDocumentId,
          iso_standard: ev.isoStandard,
          evidence_document_ids: ev.evidenceDocumentIds ?? [ev.productDocumentId],
          scoring_method: ev.scoringMethod,
          clause_weights: ev.clauseWeights ?? undefined,
        },
        { timeout: 300_000 },
      );

      const { conformity_score, summary, results } = res.data;
      const rows = this.normalizeResults(results);
      const ncDrafts = this.buildNcDrafts(rows, ev);
      const storedScore = this.computeWeightedScore(rows, ev.clauseWeights);

      await this.evalRepo.update(evaluationId, {
        status: EvaluationStatus.COMPLETED,
        conformityScore: Number.isFinite(storedScore) ? storedScore : conformity_score,
        results: rows as any,
        summary,
        ncDrafts: ncDrafts as any,
        completedAt: new Date(),
      });

      await this.notifyComplete(ev, Number.isFinite(storedScore) ? storedScore : conformity_score);

      this.logger.log(`Eval ${evaluationId} done — ${storedScore}%`);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Evaluation failed';
      await this.evalRepo.update(evaluationId, {
        status: EvaluationStatus.FAILED,
        errorMessage: String(msg).slice(0, 4000),
        completedAt: new Date(),
      });
      await this.notifyFailed(ev, String(msg));
      this.logger.error(`Eval ${evaluationId} failed: ${msg}`);
    }
  }

  private async notifyComplete(ev: Evaluation, score: number) {
    const token = this.internalToken;
    if (!token || !this.notificationUrl) return;
    try {
      await axios.post(
        `${this.notificationUrl}/api/notifications/internal/evaluation-complete`,
        {
          companyId: ev.companyId,
          userId: ev.initiatedBy,
          userEmail: ev.initiatorEmail,
          evaluationId: ev.id,
          score,
          isoStandard: ev.isoStandard,
        },
        { headers: { 'X-Internal-Token': token }, timeout: 15_000 },
      );
    } catch (e: any) {
      this.logger.warn(`notifyComplete failed: ${e.message}`);
    }
  }

  private async notifyFailed(ev: Evaluation, err: string) {
    const token = this.internalToken;
    if (!token || !this.notificationUrl) return;
    try {
      await axios.post(
        `${this.notificationUrl}/api/notifications/internal/evaluation-failed`,
        {
          companyId: ev.companyId,
          userId: ev.initiatedBy,
          userEmail: ev.initiatorEmail,
          evaluationId: ev.id,
          isoStandard: ev.isoStandard,
          error: err.slice(0, 500),
        },
        { headers: { 'X-Internal-Token': token }, timeout: 15_000 },
      );
    } catch (e: any) {
      this.logger.warn(`notifyFailed failed: ${e.message}`);
    }
  }

  async list(companyId: string) {
    const rows = await this.evalRepo
      .createQueryBuilder('e')
      .where('e.companyId = :companyId', { companyId })
      .orderBy('e.createdAt', 'DESC')
      .loadRelationCountAndMap('e.ncCount', 'e.nonConformities')
      .getMany();
    return (rows as any[]).map((r) => {
      const snap = (r.requestSnapshot ?? {}) as Record<string, unknown>;
      const meta = (snap.evaluationMetadata as Record<string, unknown> | undefined) ?? {};
      const rp = snap.reportPack as Record<string, unknown> | undefined;
      const rpp = rp?.product as Record<string, unknown> | undefined;
      let productName =
        (typeof snap.productName === 'string' && snap.productName.trim()) ||
        (typeof meta.productName === 'string' && meta.productName.trim()) ||
        (typeof rpp?.name === 'string' && rpp.name.trim()) ||
        null;
      if (productName && this.looksLikeUuid(productName)) productName = null;
      return {
        id: r.id,
        status: r.status,
        conformityScore: r.conformityScore,
        isoStandard: r.isoStandard,
        isoDocumentId: r.isoDocumentId,
        productDocumentId: r.productDocumentId,
        productId: typeof meta.productId === 'string' ? meta.productId : null,
        productName,
        initiatedBy: r.initiatedBy,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        scoringMethod: r.scoringMethod,
        requestSnapshot: r.requestSnapshot,
        _count: { nonConformities: r.ncCount ?? 0 },
      };
    });
  }

  async getOne(id: string, companyId: string) {
    const ev = await this.evalRepo.findOne({
      where: { id, companyId },
      relations: ['nonConformities', 'nonConformities.capaActions'],
    });
    if (!ev) throw new NotFoundException('Evaluation not found');
    return ev;
  }

  /**
   * Open an SSE stream of live agent-activity events for one evaluation.
   * Tenant ownership is checked first; the rag-service then provides the actual feed.
   */
  async openLiveStream(id: string, companyId: string): Promise<Readable> {
    const ev = await this.evalRepo.findOne({ where: { id, companyId }, select: ['id'] });
    if (!ev) throw new NotFoundException('Evaluation not found');

    const upstreamUrl = `${this.ragUrl}/api/evaluations/${encodeURIComponent(id)}/stream`;
    try {
      const res = await axios.get<Readable>(upstreamUrl, {
        responseType: 'stream',
        timeout: 0,
        validateStatus: () => true,
        headers: { Accept: 'text/event-stream' },
      });
      if (res.status >= 400) {
        const stream: Readable | undefined = res.data as Readable | undefined;
        if (stream) stream.destroy?.();
        throw new BadRequestException(`Upstream stream rejected (HTTP ${res.status})`);
      }
      return res.data;
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      this.logger.warn(`openLiveStream failed for ${id}: ${e?.message ?? e}`);
      throw new BadRequestException('RAG service stream unavailable');
    }
  }

  async patchClauseVerdict(
    id: string,
    companyId: string,
    userId: string,
    clauseRef: string,
    body: { verdict: string; reason: string },
  ) {
    const v = (body.verdict || '').toUpperCase();
    if (!['SATISFIED', 'PARTIALLY_SATISFIED', 'NOT_SATISFIED'].includes(v))
      throw new BadRequestException('Invalid verdict');
    if (!body.reason?.trim()) throw new BadRequestException('Reason is required');

    const ev = await this.getOne(id, companyId);
    if (ev.status !== EvaluationStatus.COMPLETED) throw new BadRequestException('Evaluation is not completed');

    const rows = this.normalizeResults(ev.results as any[]);
    const ix = rows.findIndex((r) => r.clauseReference === clauseRef);
    if (ix < 0) throw new NotFoundException('Clause not found in evaluation');

    rows[ix].override = {
      verdict: v,
      userId,
      reason: body.reason.trim(),
      at: new Date().toISOString(),
    };

    const audit = [...(ev.overrideAudit as any[] || []), {
      clauseReference: clauseRef,
      userId,
      verdict: v,
      reason: body.reason.trim(),
      at: new Date().toISOString(),
    }];

    const score = this.computeWeightedScore(rows, ev.clauseWeights);

    await this.evalRepo.update(id, {
      results: rows as any,
      conformityScore: score,
      overrideAudit: audit as any,
      ncDrafts: this.buildNcDrafts(rows, ev) as any,
    });

    const snap = (ev.requestSnapshot ?? {}) as Record<string, unknown>;
    const meta = (snap.evaluationMetadata as Record<string, unknown> | undefined) ?? {};
    const label = this.resolveHumanProductName(snap, meta, null, undefined, undefined);
    await this.companyActivity.log(
      companyId,
      userId,
      'info',
      `Evaluation · Clause verdict overridden — ${ev.isoStandard} (${label}) — ${clauseRef} → ${v.replace(/_/g, ' ')}`,
      { evaluationId: id, clauseRef, verdict: v },
    );

    return this.getOne(id, companyId);
  }

  async confirmNcDrafts(id: string, companyId: string, userId: string) {
    const ev = await this.getOne(id, companyId);
    if (!ev.ncDrafts?.length) throw new BadRequestException('No NC drafts to confirm');

    for (const d of ev.ncDrafts) {
      const draft = d as Record<string, string>;
      const nc = this.ncRepo.create({
        companyId: ev.companyId,
        detectedBy: userId,
        source: NCSource.AI_EVALUATION,
        evaluationId: ev.id,
        title: draft.title,
        description: draft.description,
        classification: (draft.classification as NCClassification) || NCClassification.MAJOR,
        isoClause: draft.isoClause,
        isoStandard: draft.isoStandard,
      });
      await this.ncRepo.save(nc);
    }

    await this.evalRepo.update(id, {
      ncDrafts: [],
      ncDraftsConfirmedAt: new Date(),
    });

    const n = ev.ncDrafts.length;
    await this.companyActivity.log(
      companyId,
      userId,
      'success',
      `Evaluation · Confirmed NC drafts from AI — ${ev.isoStandard} (${n} non-conformit${n === 1 ? 'y' : 'ies'})`,
      { evaluationId: id, count: n },
    );

    return { message: 'Non-conformities created', evaluationId: id };
  }

  async retry(id: string, companyId: string, userId: string) {
    const ev = await this.evalRepo.findOne({ where: { id, companyId } });
    if (!ev) throw new NotFoundException('Evaluation not found');
    if (ev.status !== EvaluationStatus.FAILED) throw new BadRequestException('Only failed evaluations can be retried');

    const snap = ev.requestSnapshot as Record<string, unknown> | null;
    if (!snap) throw new BadRequestException('Missing stored request payload for retry');

    // TypeORM QueryDeepPartialEntity omits `null` for nullable columns; runtime accepts null to clear.
    await this.evalRepo.update(id, {
      status: EvaluationStatus.QUEUED,
      errorMessage: '',
      completedAt: null,
      conformityScore: null,
      results: null,
      summary: '',
      ncDrafts: [],
      ncDraftsConfirmedAt: null,
      overrideAudit: [],
    } as any);

    await this.evalQueue.add('run', { evaluationId: id }, { removeOnComplete: true, attempts: 2 });

    await this.companyActivity.log(
      companyId,
      userId,
      'info',
      `Evaluation · Re-queued after failure — ${ev.isoStandard}`,
      { evaluationId: id },
    );

    return { job_id: id, evaluationId: id, status: 'Queued', message: 'Evaluation re-queued' };
  }

  private wrapPdfLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const normalized = (text || '').replace(/\r\n/g, '\n');
    const linesOut: string[] = [];
    for (const para of normalized.split('\n')) {
      const words = para.split(/\s+/).filter(Boolean);
      let cur = '';
      for (const w of words) {
        const candidate = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          cur = candidate;
          continue;
        }
        if (cur) {
          linesOut.push(cur);
          cur = '';
        }
        let rest = w;
        while (rest.length > 0) {
          if (font.widthOfTextAtSize(rest, size) <= maxWidth) {
            cur = rest;
            break;
          }
          let lo = 1;
          let hi = rest.length;
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            const slice = rest.slice(0, mid);
            if (font.widthOfTextAtSize(slice, size) <= maxWidth) lo = mid;
            else hi = mid - 1;
          }
          const take = Math.max(1, lo);
          linesOut.push(rest.slice(0, take));
          rest = rest.slice(take);
        }
      }
      if (cur) linesOut.push(cur);
      if (!words.length) linesOut.push('');
    }
    return linesOut.length ? linesOut : [''];
  }

  /** Excel "Report Ref" line: `Standard ref -- Product -- YYYY-MM-DD` (template row 5). */
  private buildExcelReportRefDashLine(ev: Evaluation, reportPack: ReportPack): string {
    const ref =
      reportPack.standard.reference && reportPack.standard.reference !== '—'
        ? reportPack.standard.reference
        : ev.isoStandard;
    const prod =
      reportPack.product.name && reportPack.product.name !== '—'
        ? reportPack.product.name
        : '—';
    const dSrc = ev.completedAt ?? ev.createdAt;
    const ds = dSrc ? new Date(dSrc).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    return `${ref} -- ${prod} -- ${ds}`;
  }

  private async exportExcelWith(bundle: EvaluationExportBundle): Promise<Buffer> {
    const { ev, lookup, reportPack } = bundle;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Qurelio';
    wb.created = new Date();

    const rows = this.normalizeResults(ev.results as any[]);

    // ── Colours ──────────────────────────────────────────────────
    const BRAND_PRIMARY = 'FF1A56DB';
    const BRAND_DARK = 'FF0F3460';
    const WHITE = 'FFFFFFFF';
    const TEXT_DARK = 'FF1E293B';
    const TEXT_MUTED = 'FF64748B';
    const GRID = 'FFE2E8F0';
    const PASS_BG = 'FFE8F5E9';
    const MINOR_BG = 'FFFFF8E1';
    const MAJOR_BG = 'FFFFEBEE';
    const NA_BG = 'FFF5F5F5';

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: GRID } },
      left: { style: 'thin', color: { argb: GRID } },
      bottom: { style: 'thin', color: { argb: GRID } },
      right: { style: 'thin', color: { argb: GRID } },
    };

    // ═══════════════════════════════════════════════════════════════
    // SHEET 1 — Clause-by-Clause Analysis (matches frontend UI)
    // ═══════════════════════════════════════════════════════════════
    const ws = wb.addWorksheet('Clause-by-Clause Analysis', {
      properties: { tabColor: { argb: BRAND_PRIMARY } },
    });
    const COL_COUNT = 11;

    ws.getColumn(1).width = 10;    // Clause #
    ws.getColumn(2).width = 28;    // Title
    ws.getColumn(3).width = 55;    // Summary
    ws.getColumn(4).width = 12;    // Applicable
    ws.getColumn(5).width = 14;    // Status
    ws.getColumn(6).width = 12;    // Confidence
    ws.getColumn(7).width = 55;    // Justification
    ws.getColumn(8).width = 55;    // Evidence Found
    ws.getColumn(9).width = 55;    // Gaps
    ws.getColumn(10).width = 55;   // Recommendations
    ws.getColumn(11).width = 30;   // Override

    // ── Title row ────────────────────────────────────────────────
    const stdRef = reportPack.standard.reference && reportPack.standard.reference !== '—'
      ? reportPack.standard.reference : ev.isoStandard;
    ws.mergeCells(1, 1, 1, COL_COUNT);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `CLAUSE-BY-CLAUSE ANALYSIS — ${stdRef}`;
    titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center', indent: 1 };
    ws.getRow(1).height = 32;
    for (let c = 1; c <= COL_COUNT; c++) { ws.getCell(1, c).fill = titleCell.fill; }

    ws.getRow(2).height = 6;

    // ── Header row ───────────────────────────────────────────────
    const headers = [
      { h: 'Clause #', w: 10 },
      { h: 'Title', w: 28 },
      { h: 'Summary', w: 55 },
      { h: 'Applicable', w: 12 },
      { h: 'Status', w: 14 },
      { h: 'Confidence', w: 12 },
      { h: 'Justification', w: 55 },
      { h: 'Evidence Found', w: 55 },
      { h: 'Gaps', w: 55 },
      { h: 'Recommendations', w: 55 },
      { h: 'Override', w: 30 },
    ];
    const hdrRow = 3;
    headers.forEach(({ h }, i) => {
      const c = ws.getCell(hdrRow, i + 1);
      c.value = h;
      c.font = { bold: true, size: 10, color: { argb: WHITE } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_PRIMARY } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      c.border = thinBorder;
    });
    ws.getRow(hdrRow).height = 26;

    // ── Data rows (mirrors frontend normalizeEvalRow) ────────────
    let dr = hdrRow + 1;
    for (const row of rows) {
      const eff = this.effectiveVerdict(row);
      const u = (eff || '').toUpperCase();

      // Status key (same logic as frontend normalizeEvalRow)
      let statusKey = 'N/A';
      if (u === 'SATISFIED') statusKey = 'CONFORMANT';
      else if (u === 'PARTIALLY_SATISFIED') statusKey = 'MINOR_NC';
      else if (u === 'NOT_SATISFIED') statusKey = 'MAJOR_NC';

      // Status label (same as frontend evalStatusLabel)
      const STATUS_LABELS: Record<string, string> = {
        CONFORMANT: 'PASS',
        MINOR_NC: 'MINOR NC',
        MAJOR_NC: 'MAJOR NC',
        CRITICAL_NC: 'CRITICAL',
        'N/A': 'N/A',
      };
      const statusLabel = STATUS_LABELS[statusKey] ?? statusKey.replace(/_/g, ' ');

      // Confidence (0-1, same normalisation as frontend)
      let conf = typeof row.confidence === 'number' ? row.confidence : parseFloat(String(row.confidence)) || 0;
      if (conf > 1) conf /= 100;

      // Applicable (same logic as frontend: defaults true)
      const applicable = (row as any).applicable !== false && !this.isStructuralClauseRow(row, this.pickClauseEnhancement(lookup, row.clauseReference));

      // Justification (from raw data or gaps, same as frontend)
      const justification =
        ((row as any).justification ??
          (Array.isArray(row.gaps) && row.gaps.length ? row.gaps.join('; ') : '')) || '—';

      // Clean text: collapse whitespace, replace newlines with "; "
      const cleanText = (t: string) =>
        (t || '').replace(/\r?\n+/g, '; ').replace(/[ \t]+/g, ' ').trim();

      // Evidence found (first evidence excerpt, cleaned)
      const allEvChunks = this.deduplicateEvidence(row.supportingEvidence || []);
      const firstEv = allEvChunks[0];
      const evidenceFound = firstEv
        ? this.cleanEvidenceText(firstEv.excerpt || '').split('\n')[0].slice(0, 200)
        : '';

      // Supporting evidence text (deduplicated, cleaned, numbered)
      const evidenceChunks = allEvChunks.map(
        (x, i) => {
          const src = x.sourceLabel ? `[${x.sourceLabel}]` : '';
          const txt = this.cleanEvidenceText(x.excerpt || '');
          const firstLine = txt.split('\n')[0].trim().slice(0, 150);
          if (!firstLine) return null;
          return `${i + 1}. ${src ? `${src} ` : ''}${firstLine}`;
        },
      ).filter(Boolean);
      const evidenceText = evidenceChunks.join('\n');

      // Gaps
      const gapsText = Array.isArray(row.gaps) && row.gaps.length
        ? row.gaps.join('\n')
        : '';

      // Suggestions / Recommendations
      const suggestionsText = Array.isArray(row.suggestions) && row.suggestions.length
        ? row.suggestions.join('\n')
        : '';

      // Override
      const overrideText = row.override
        ? `${row.override.verdict ? row.override.verdict.replace(/_/g, ' ') : ''}${row.override.reason ? ` — ${row.override.reason}` : ''}`
        : '';

      const excelRow = ws.getRow(dr);
      excelRow.getCell(1).value = row.clauseReference || '—';
      excelRow.getCell(2).value = row.clauseTitle || `Clause ${row.clauseReference || '—'}`;
      excelRow.getCell(3).value = cleanText(row.clauseSummary || row.clauseTextExcerpt || '');
      excelRow.getCell(4).value = applicable ? 'YES' : 'NO';
      excelRow.getCell(5).value = statusLabel;
      excelRow.getCell(6).value = statusKey !== 'N/A' ? `${(conf * 100).toFixed(0)}%` : '—';
      excelRow.getCell(7).value = justification;
      excelRow.getCell(8).value = evidenceText || '—';
      excelRow.getCell(9).value = gapsText || '—';
      excelRow.getCell(10).value = suggestionsText || '—';
      excelRow.getCell(11).value = overrideText || '—';

      // Row background colour by status
      let bg = WHITE;
      if (statusKey === 'CONFORMANT') bg = PASS_BG;
      else if (statusKey === 'MINOR_NC') bg = MINOR_BG;
      else if (statusKey === 'MAJOR_NC' || statusKey === 'CRITICAL_NC') bg = MAJOR_BG;
      else bg = NA_BG;

      for (let c = 1; c <= COL_COUNT; c++) {
        const cell = excelRow.getCell(c);
        cell.font = { size: 10, color: { argb: TEXT_DARK } };
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      }

      // Status cell bold colour
      const stCell = excelRow.getCell(5);
      stCell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (statusKey === 'CONFORMANT') {
        stCell.font = { bold: true, size: 10, color: { argb: 'FF16A34A' } };
      } else if (statusKey === 'MAJOR_NC' || statusKey === 'CRITICAL_NC') {
        stCell.font = { bold: true, size: 10, color: { argb: 'FFDC2626' } };
      } else if (statusKey === 'MINOR_NC') {
        stCell.font = { bold: true, size: 10, color: { argb: 'FFCA8A04' } };
      }

      // Confidence & applicable centered
      excelRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      excelRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      excelRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      dr += 1;
    }

    // ── Freeze + auto-filter ─────────────────────────────────────
    if (rows.length) {
      ws.autoFilter = { from: { row: hdrRow, column: 1 }, to: { row: hdrRow, column: COL_COUNT } };
      ws.views = [{ state: 'frozen', ySplit: hdrRow }];
    }

    ws.pageSetup = { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' };

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf as ArrayBuffer);
  }

  private async exportPdfWith(bundle: EvaluationExportBundle): Promise<Buffer> {
    const { ev, lookup, reportRef, reportPack } = bundle;
    const companyNamePdf =
      reportPack.company.companyName && reportPack.company.companyName !== '—'
        ? reportPack.company.companyName
        : 'Company';
    const w = await createBrandedPdfWriter({
      companyName: companyNamePdf,
      reportTitle: 'Conformity report',
    });

    const drawBlock = (text: string, size: number, bold: boolean, lineGap = 3) => {
      brandedDrawBlock(w, text, size, bold, lineGap);
    };
    const bar = (label: string) => brandedSectionBar(w, label);
    const ySpacer = (n: number) => { w.y -= n; };

    drawBlock(reportPack.standard.reference, 12, true, 4);
    drawBlock(reportPack.standard.title, 11, false, 3);
    ySpacer(8);

    const preparedByPdf = this.formatPreparedBy(ev, reportPack);

    bar('Report information');
    drawBlock(`Report reference: ${reportRef}`, 10, false);
    drawBlock(`Company: ${companyNamePdf}`, 10, false);
    drawBlock(`Company ID: ${ev.companyId}`, 10, false);
    drawBlock(`Prepared by: ${preparedByPdf}`, 10, false);
    drawBlock(`Status: ${ev.status}`, 10, false);
    drawBlock(
      `Date of issue: ${(ev.completedAt ?? ev.createdAt) ? new Date(ev.completedAt ?? ev.createdAt).toLocaleDateString() : '—'}`,
      10,
      false,
    );
    drawBlock(`Conformity score: ${ev.conformityScore != null ? `${ev.conformityScore.toFixed(1)}%` : 'Pending'}`, 10, false);
    ySpacer(4);

    bar('Standards');
    drawBlock(`Reference: ${reportPack.standard.reference}`, 10, false);
    drawBlock(`Title: ${reportPack.standard.title}`, 10, false);
    drawBlock(`Version: ${reportPack.standard.version}`, 10, false);
    drawBlock(`Effective date: ${reportPack.standard.effectiveDate}`, 10, false);
    ySpacer(4);

    bar('Product');
    drawBlock(`Name: ${reportPack.product.name}`, 10, false);
    drawBlock(`Category: ${reportPack.product.category}`, 10, false);
    drawBlock(`Product file added: ${this.formatProductFileAddedDisplay(reportPack)}`, 10, false);
    ySpacer(8);

    drawBlock('Executive summary', 13, true, 4);
    drawBlock(ev.summary || '—', 10, false);
    ySpacer(10);

    const stdLine = `${reportPack.standard.reference} — ${reportPack.standard.title}`;
    bar('Clauses / Requirements');
    drawBlock(stdLine, 10, true, 3);

    const rows = this.normalizeResults(ev.results as any[]);
    for (const r of rows) {
      const enh = this.pickClauseEnhancement(lookup, r.clauseReference);
      const structural = this.isStructuralClauseRow(r, enh);
      const eff = this.effectiveVerdict(r);
      const reqText = [enh.title, enh.summary, r.clauseTextExcerpt].filter((x) => this.str(x)).join('\n\n');
      ySpacer(4);
      drawBlock(`Clause ${r.clauseReference} · Verdict ${structural ? 'N/A' : this.verdictShort(eff)}`, 11, true, 3);
      drawBlock(`Requirement — Test:\n${reqText || '—'}`, 10, false, 2);
      drawBlock(`Result — Remark:\n${this.buildJustification(r, eff, structural)}`, 10, false, 2);
    }

    return finalizeBrandedPdf(w);
  }

  async exportExcel(id: string, companyId: string): Promise<Buffer> {
    return this.exportExcelWith(await this.loadEvaluationExportBundle(id, companyId));
  }

  async exportPdf(id: string, companyId: string): Promise<Buffer> {
    return this.exportPdfWith(await this.loadEvaluationExportBundle(id, companyId));
  }

  private async exportCsvWith(bundle: EvaluationExportBundle): Promise<Buffer> {
    const { ev, lookup, reportPack } = bundle;
    const rows = this.normalizeResults(ev.results as any[]);

    const csvEscape = (text: string): string => {
      const t = (text || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
      if (t.includes(',') || t.includes('"') || t.includes('\n')) {
        return `"${t.replace(/"/g, '""')}"`;
      }
      return t;
    };

    const stdRef = reportPack.standard.reference && reportPack.standard.reference !== '—'
      ? reportPack.standard.reference : ev.isoStandard;
    const prodName = reportPack.product.name && reportPack.product.name !== '—'
      ? reportPack.product.name : '—';
    const dateStr = (ev.completedAt ?? ev.createdAt)
      ? new Date(ev.completedAt ?? ev.createdAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const header = [
      'Evaluation ID',
      'Report Reference',
      'Standard',
      'Product',
      'Company',
      'Date',
      'Overall Score (%)',
      'Executive Summary',
    ];
    const metaRow = [
      csvEscape(ev.id),
      csvEscape(`${stdRef} -- ${prodName} -- ${dateStr}`),
      csvEscape(stdRef),
      csvEscape(prodName),
      csvEscape(reportPack.company.companyName || '—'),
      csvEscape(dateStr),
      csvEscape(String(ev.conformityScore != null ? ev.conformityScore.toFixed(1) : '—')),
      csvEscape(ev.summary || '—'),
    ];

    const detailHeaders = [
      'Clause #',
      'Clause Title',
      'Clause Summary',
      'Applicable',
      'Status',
      'Status Label',
      'Confidence (%)',
      'Justification',
      'Evidence Found',
      'Gaps',
      'Recommendations',
      'Override Verdict',
      'Override Reason',
      'Override Date',
      'Reasoning',
      'Requirement Elements',
      'Evidence Assessment',
    ];

    const lines: string[] = [];
    lines.push(header.map(csvEscape).join(','));
    lines.push(metaRow.join(','));
    lines.push('');
    lines.push(detailHeaders.map(csvEscape).join(','));

    for (const r of rows) {
      const eff = this.effectiveVerdict(r);
      const u = (eff || '').toUpperCase();

      let statusKey = 'N/A';
      if (u === 'SATISFIED') statusKey = 'CONFORMANT';
      else if (u === 'PARTIALLY_SATISFIED') statusKey = 'MINOR_NC';
      else if (u === 'NOT_SATISFIED') statusKey = 'MAJOR_NC';

      const STATUS_LABELS: Record<string, string> = {
        CONFORMANT: 'PASS',
        MINOR_NC: 'MINOR NC',
        MAJOR_NC: 'MAJOR NC',
        CRITICAL_NC: 'CRITICAL',
        'N/A': 'N/A',
      };
      const statusLabel = STATUS_LABELS[statusKey] ?? statusKey.replace(/_/g, ' ');

      let conf = typeof r.confidence === 'number' ? r.confidence : parseFloat(String(r.confidence)) || 0;
      if (conf > 1) conf *= 100;

      const enh = this.pickClauseEnhancement(lookup, r.clauseReference);
      const applicable = (r as any).applicable !== false && !this.isStructuralClauseRow(r, enh);

      const allEvChunks = this.deduplicateEvidence(r.supportingEvidence || []);
      const firstEv = allEvChunks[0];
      const evidenceFound = firstEv
        ? this.cleanEvidenceText(firstEv.excerpt || '').split('\n')[0].slice(0, 200)
        : '';

      const evidenceBullets = allEvChunks.map(
        (x, i) => {
          const src = x.sourceLabel ? `[${x.sourceLabel}]` : '';
          const txt = this.cleanEvidenceText(x.excerpt || '');
          const firstLine = txt.split('\n')[0].trim().slice(0, 200);
          if (!firstLine) return null;
          return `${i + 1}. ${src ? `${src} ` : ''}${firstLine}`;
        },
      ).filter(Boolean);
      const allEvidenceText = evidenceBullets.join(' | ');

      const gapsText = Array.isArray(r.gaps) && r.gaps.length
        ? r.gaps.join('; ')
        : '';
      const suggestionsText = Array.isArray(r.suggestions) && r.suggestions.length
        ? r.suggestions.join('; ')
        : '';
      const justification =
        ((r as any).justification ??
          (Array.isArray(r.gaps) && r.gaps.length ? r.gaps.join('; ') : '')) || '—';

      const reqElements = (r as any).requirementElements || (r as any).requirement_elements;
      const reqElementsText = Array.isArray(reqElements) && reqElements.length
        ? reqElements.map((e: any) => `${e.element || ''}: ${e.status || ''}`).join('; ')
        : '';
      const evidenceAssessment = (r as any).evidenceAssessment || (r as any).evidence_assessment;
      const evidenceAssessText = Array.isArray(evidenceAssessment) && evidenceAssessment.length
        ? evidenceAssessment.map((e: any) => `#${e.chunk_id || ''} ${e.relevance || ''} ${e.supports ? 'supports' : 'gaps'}`).join('; ')
        : '';
      const reasoning = (r as any).reasoning || '';

      const overrideVerdict = r.override?.verdict ? r.override.verdict.replace(/_/g, ' ') : '';
      const overrideReason = r.override?.reason || '';
      const overrideDate = r.override?.at ? new Date(r.override.at).toISOString().slice(0, 10) : '';

      const detailRow = [
        csvEscape(r.clauseReference || ''),
        csvEscape(r.clauseTitle || ''),
        csvEscape(r.clauseSummary || ''),
        csvEscape(applicable ? 'YES' : 'NO'),
        csvEscape(statusKey),
        csvEscape(statusLabel),
        csvEscape(statusKey !== 'N/A' ? `${conf.toFixed(0)}` : '—'),
        csvEscape(justification),
        csvEscape(evidenceFound),
        csvEscape(gapsText),
        csvEscape(suggestionsText),
        csvEscape(overrideVerdict || '—'),
        csvEscape(overrideReason || '—'),
        csvEscape(overrideDate || '—'),
        csvEscape(reasoning),
        csvEscape(reqElementsText),
        csvEscape(evidenceAssessText),
      ];
      lines.push(detailRow.join(','));
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  async export(id: string, companyId: string, format: string): Promise<{ body: Buffer; contentType: string; filename: string }> {
    const bundle = await this.loadEvaluationExportBundle(id, companyId);
    const f = (format || 'xlsx').toLowerCase();
    if (f === 'pdf' || f === 'application/pdf') {
      const body = await this.exportPdfWith(bundle);
      return {
        body,
        contentType: 'application/pdf',
        filename: `${bundle.filenameBase}.pdf`,
      };
    }
    if (f === 'csv') {
      const body = await this.exportCsvWith(bundle);
      return {
        body,
        contentType: 'text/csv; charset=utf-8',
        filename: `${bundle.filenameBase}.csv`,
      };
    }
    const body = await this.exportExcelWith(bundle);
    return {
      body,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${bundle.filenameBase}.xlsx`,
    };
  }

  /**
   * Permanently remove an evaluation. Linked NCs keep their record but are detached from this evaluation.
   */
  async remove(id: string, companyId: string, userId: string): Promise<void> {
    const ev = await this.evalRepo.findOne({ where: { id, companyId } });
    if (!ev) throw new NotFoundException('Evaluation not found');
    await this.companyActivity.log(
      companyId,
      userId,
      'warning',
      `Evaluation · Permanently deleted — ${ev.isoStandard}`,
      { evaluationId: id },
    );
    await this.ncRepo
      .createQueryBuilder()
      .update(NonConformity)
      .set({ evaluationId: null })
      .where('company_id = :companyId', { companyId })
      .andWhere('evaluation_id = :id', { id })
      .execute();
    await this.evalRepo.delete({ id, companyId });
  }
}
