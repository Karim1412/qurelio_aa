'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, BarChart3, ChevronDown, ChevronUp, FileSpreadsheet, Loader2, RefreshCw } from '@/components/icons';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PlaceholderRoutePage } from '@/components/ui/placeholder-route-page';
import { evaluationApi, documentApi, productApi } from '@/lib/api';
import { formatEvaluationPair } from '@/lib/evaluation-pair-label';
import { formatEvaluationRetryError } from '@/lib/evaluation-retry-error';
import { useAuthStore } from '@/lib/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/utils/cn';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AgentActivityPanel } from '@/components/dashboard/AgentActivityPanel';
import {
  evalStatCardClass,
  evalStatusLabel,
  evalStatusRowClass,
  evalStatusTone,
  type EvalStatusTone,
} from '@/lib/theme-badges';

function ncDraftListTitle(d: Record<string, unknown>) {
  const raw = String(d?.title ?? '').trim();
  if (raw && !/\bundefined\b/i.test(raw)) return raw;
  const c = String(d?.clauseReference ?? d?.isoClause ?? '').trim();
  if (c) return `NC draft — Clause ${c}`;
  return 'NC draft — add clause reference and upload evidence';
}

/** Maps RAG / evaluation-service clause rows to the UI row shape (legacy + new verdicts). */
function normalizeEvalRow(r: any) {
  const ref = (r.clauseReference ?? r.clause_reference ?? r.clause_id ?? '').toString();
  const eff = (r.override?.verdict ?? r.verdict ?? '').toString().toUpperCase();
  const legacy = (r.status || '').toString().toUpperCase();

  let statusKey = 'N/A';
  if (eff === 'SATISFIED') statusKey = 'CONFORMANT';
  else if (eff === 'PARTIALLY_SATISFIED') statusKey = 'MINOR_NC';
  else if (eff === 'NOT_SATISFIED') statusKey = 'MAJOR_NC';
  else if (['CONFORMANT', 'MINOR_NC', 'MAJOR_NC', 'CRITICAL_NC', 'N/A'].includes(legacy)) statusKey = legacy;
  else if (['SATISFIED', 'PARTIALLY_SATISFIED', 'NOT_SATISFIED'].includes(legacy)) {
    statusKey = legacy === 'SATISFIED' ? 'CONFORMANT' : legacy === 'PARTIALLY_SATISFIED' ? 'MINOR_NC' : 'MAJOR_NC';
  }

  let conf = typeof r.confidence === 'number' ? r.confidence : parseFloat(r.confidence) || 0;
  if (conf > 1) conf /= 100;

  const se = r.supportingEvidence ?? r.supporting_evidence ?? [];
  const gaps = Array.isArray(r.gaps) ? r.gaps : [];
  const suggestions = Array.isArray(r.suggestions) ? r.suggestions : [];
  const first = Array.isArray(se) && se.length ? se[0] : null;
  const evText = first ? `${first.documentId || first.document_id || ''}: ${first.excerpt || ''}`.trim() : '';

  const reasoning = r.reasoning ?? '';
  const requirementElements = Array.isArray(r.requirementElements ?? r.requirement_elements) ? (r.requirementElements ?? r.requirement_elements) : [];
  const evidenceAssessment = Array.isArray(r.evidenceAssessment ?? r.evidence_assessment) ? (r.evidenceAssessment ?? r.evidence_assessment) : [];

  return {
    ...r,
    clause_id: ref,
    clause_title: r.clause_title || `Clause ${ref}`,
    clause_summary: r.clause_summary ?? r.clauseTextExcerpt ?? r.clause_text_excerpt ?? '',
    gaps,
    suggestions,
    status: statusKey,
    confidence: conf,
    justification:
      (r.justification ??
        (Array.isArray(r.gaps) && r.gaps.length ? r.gaps.join('; ') : '')) || '—',
    evidence_found: r.evidence_found ?? evText,
    applicable: r.applicable !== false,
    _supportingEvidence: se,
    reasoning,
    requirementElements,
    evidenceAssessment,
  };
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 90 ? '#2e7d32' : score >= 75 ? '#ef6c00' : score >= 60 ? '#f9a825' : '#c62828';
  const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Moderate' : 'Poor';
  return (
    <div className="text-center">
      <div className="relative mx-auto mb-2 flex h-[120px] w-[120px] items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--gauge-track)" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 264} 264`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black" style={{ color }}>
            {score.toFixed(1)}%
          </span>
          <span className="text-[10px] font-semibold" style={{ color }}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: EvalStatusTone }) {
  return (
    <div className={evalStatCardClass(tone)}>
      <p className="eval-stat-value">{value}</p>
      <p className="text-[11px] font-semibold text-[var(--muted)]">{label}</p>
    </div>
  );
}

function ClauseRow({
  row,
  idx,
  evaluationId,
  canOverride,
  completed,
  onUpdated,
}: {
  row: any;
  idx: number;
  evaluationId: string;
  canOverride: boolean;
  completed: boolean;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState(() => (row.override?.verdict ?? row.verdict ?? 'NOT_SATISFIED').toString().toUpperCase());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const statusKey = row.status || row.verdict || 'N/A';
  const aiVerdict = (row.verdict ?? '').toString().toUpperCase();

  React.useEffect(() => {
    setVerdict((row.override?.verdict ?? row.verdict ?? 'NOT_SATISFIED').toString().toUpperCase());
  }, [row.override?.verdict, row.verdict]);

  const submitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!reason.trim()) {
      toast.error('A reason is required (audit trail).');
      return;
    }
    setSaving(true);
    try {
      await evaluationApi.patchClause(evaluationId, row.clause_id, {
        verdict: verdict.toUpperCase(),
        reason: reason.trim(),
      });
      toast.success('Clause verdict updated');
      setReason('');
      onUpdated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TableRow
        className={cn(
          'cursor-pointer transition-hover',
          evalStatusRowClass(statusKey, { open, striped: idx % 2 === 0 }),
        )}
        onClick={() => setOpen(!open)}
      >
        <TableCell className="whitespace-nowrap font-bold text-[var(--text-primary)]">{row.clause_id || '—'}</TableCell>
        <TableCell className="max-w-[200px]">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{row.clause_title}</p>
          <p className="line-clamp-2 text-xs text-[var(--muted)]">{row.clause_summary}</p>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="default" className="text-[10px]">
            {row.applicable ? 'YES' : 'NO'}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <span className="eval-status-chip">{evalStatusLabel(statusKey)}</span>
          {row.override?.verdict && (
            <p className="mt-0.5 text-[9px] font-semibold text-[var(--muted)]">Override</p>
          )}
        </TableCell>
        <TableCell className="w-[100px] text-center">
          {row.status !== 'N/A' ? (
            <div>
              <p
                className="text-xs font-bold"
                style={{ color: `var(--eval-${evalStatusTone(statusKey)}-color)` }}
              >
                {(row.confidence * 100).toFixed(0)}%
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--gauge-track)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.confidence * 100}%`,
                    background: `var(--eval-${evalStatusTone(statusKey)}-color)`,
                  }}
                />
              </div>
            </div>
          ) : (
            <span className="text-xs text-[var(--muted)]">—</span>
          )}
        </TableCell>
        <TableCell className="max-w-[320px]">
          <p className="line-clamp-2 text-xs text-[var(--muted)]">{row.justification}</p>
        </TableCell>
        <TableCell className="w-12 text-center">
          <button type="button" className="rounded p-1" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={7} className="border-0 p-0">
            <div
              className={cn('eval-status-detail p-6', `eval-status-row--${evalStatusTone(statusKey)}`)}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">AI verdict</p>
                  <p className="text-sm font-semibold">{aiVerdict.replace(/_/g, ' ')}</p>
                </div>
                {row.override?.verdict && (
                  <div className="alert-surface-override">
                    <p className="text-[11px] font-bold uppercase">Manual override</p>
                    <p>
                      Set to <strong>{String(row.override.verdict).replace(/_/g, ' ')}</strong>
                      {row.override.reason ? ` — ${row.override.reason}` : ''}
                    </p>
                    {row.override.at && (
                      <p className="mt-1 text-[10px] opacity-80">Recorded at {format(new Date(row.override.at), 'PPp')}</p>
                    )}
                  </div>
                )}
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Justification</p>
                  <p className="text-sm">{row.justification}</p>
                </div>
                {row.evidence_found && (
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                      Evidence found in document
                    </p>
                    <p className="border-l-3 border-[var(--brand-primary)] pl-3 text-sm italic text-[var(--muted)]">
                      &ldquo;{row.evidence_found}&rdquo;
                    </p>
                  </div>
                )}
                {Array.isArray(row._supportingEvidence) && row._supportingEvidence.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                      Evidence chunks used for this verdict (explainability)
                    </p>
                    <ul className="space-y-2 text-sm">
                      {row._supportingEvidence.slice(0, 8).map((ex: any, i: number) => (
                        <li key={i} className="rounded border border-[var(--border)] bg-[var(--surface)] p-2">
                          <span className="text-[10px] font-mono text-[var(--muted)]">
                            {(ex.documentId || ex.document_id) || '—'}
                            {(ex.sourceLabel || ex.source_label) ? ` · ${ex.sourceLabel || ex.source_label}` : ''}
                          </span>
                          <p className="mt-1 text-[var(--text-primary)]">{ex.excerpt || ''}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {row.gaps?.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-red-700">Gaps identified</p>
                    <ul className="list-disc pl-5 text-sm text-red-700">
                      {row.gaps.map((g: string, i: number) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {row.suggestions?.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-800">Recommendations</p>
                    <ul className="list-disc pl-5 text-sm text-blue-900">
                      {row.suggestions.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {row.reasoning && (
                  <div className="md:col-span-2">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">AI Reasoning</p>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                      {row.reasoning}
                    </div>
                  </div>
                )}
                {Array.isArray(row.requirementElements) && row.requirementElements.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Requirement Elements Analysis</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="p-2 text-left font-semibold">Requirement Element</th>
                            <th className="p-2 text-left font-semibold">Status</th>
                            <th className="p-2 text-left font-semibold">Evidence Refs</th>
                            <th className="p-2 text-left font-semibold">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.requirementElements.map((el: any, i: number) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0">
                              <td className="p-2 text-[var(--text-primary)]">{el.element || '—'}</td>
                              <td className="p-2">
                                <span className={`font-semibold ${
                                  el.status === 'covered' ? 'text-green-700' :
                                  el.status === 'partial' ? 'text-amber-700' : 'text-red-700'
                                }`}>
                                  {el.status || '—'}
                                </span>
                              </td>
                              <td className="p-2 text-[var(--muted)]">
                                {Array.isArray(el.evidence_refs) ? el.evidence_refs.join(', ') : '—'}
                              </td>
                              <td className="p-2 text-[var(--text-primary)]">{el.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {canOverride && completed && row.clause_id && (
                  <form className="md:col-span-2 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4" onSubmit={submitOverride}>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Override verdict (QM / Auditor)</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">New verdict</Label>
                        <select
                          className="mt-1 flex h-10 w-full rounded-lg border border-[var(--input-border)] px-2 text-sm"
                          value={verdict}
                          onChange={(e) => setVerdict(e.target.value)}
                        >
                          <option value="SATISFIED">Satisfied</option>
                          <option value="PARTIALLY_SATISFIED">Partially satisfied</option>
                          <option value="NOT_SATISFIED">Not satisfied</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Reason (logged with your user id)</Label>
                        <Textarea
                          className="mt-1 min-h-[72px] text-sm"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Explain why the AI verdict is being changed…"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save override'}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function EvaluationReportPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [ev, setEv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ncDialogOpen, setNcDialogOpen] = useState(false);
  const [ncBusy, setNcBusy] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);
  const [isoNorms, setIsoNorms] = useState<{ id: string; name?: string; isoStandard?: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name?: string; documents?: { id: string }[] }[]>([]);
  const [tenantDocs, setTenantDocs] = useState<
    { id: string; productId?: string | null; productName?: string | null }[]
  >([]);

  const perms = usePermissions();
  const canOverride = perms.approveRejectDocuments;
  const canConfirmNc = perms.launchComplianceEvaluation;

  const refresh = React.useCallback(() => {
    return evaluationApi.get(id).then((r) => setEv(r.data));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    evaluationApi
      .get(id)
      .then((r) => setEv(r.data))
      .catch(() => toast.error('Failed to load evaluation'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    Promise.all([documentApi.getIsoNorms(), productApi.list(), documentApi.list()])
      .then(([n, p, d]) => {
        setIsoNorms(n.data ?? []);
        setProducts(p.data ?? []);
        const raw = Array.isArray(d.data) ? d.data : [];
        setTenantDocs(
          raw.map((x: { id: string; productId?: string | null; product?: { name?: string } | null }) => ({
            id: x.id,
            productId: x.productId ?? null,
            productName: x.product?.name ?? null,
          })),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ev || ev.status === 'COMPLETED' || ev.status === 'FAILED') return;
    const t = setInterval(() => {
      evaluationApi.get(id).then((r) => setEv(r.data)).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [ev?.status, id]);

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  function parseFilenameFromContentDisposition(cd: string | undefined): string | null {
    if (!cd) return null;
    const star = cd.match(/filename\*=UTF-8''([^;\s]+)/i);
    if (star) {
      try {
        return decodeURIComponent(star[1].trim());
      } catch {
        return star[1].trim();
      }
    }
    const q = cd.match(/filename="([^"]+)"/i);
    if (q) return q[1].trim();
    const u = cd.match(/filename=([^;\s]+)/i);
    return u ? u[1].trim().replace(/^["']|["']$/g, '') : null;
  }

  const handleExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
    try {
      const res = await evaluationApi.export(id, format);
      const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx';
      const cd = res.headers['content-disposition'] as string | undefined;
      const name = parseFilenameFromContentDisposition(cd) ?? `evaluation-report-${id}.${ext}`;
      downloadBlob(new Blob([res.data]), name);
      const labels: Record<string, string> = { pdf: 'PDF downloaded', csv: 'CSV downloaded', xlsx: 'Excel downloaded' };
      toast.success(labels[format] || 'Exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleRetry = async () => {
    if (!ev) return;
    const pair = formatEvaluationPair(ev, isoNorms, products, tenantDocs);
    setRetryBusy(true);
    try {
      await evaluationApi.retry(id);
      toast.success(`Re-queued: ${pair.summary}`);
      await refresh();
    } catch (err: unknown) {
      toast.error(formatEvaluationRetryError(err));
    } finally {
      setRetryBusy(false);
    }
  };

  const handleConfirmNc = async () => {
    setNcBusy(true);
    try {
      await evaluationApi.confirmNcDrafts(id);
      toast.success('Non-conformity records created.');
      setNcDialogOpen(false);
      await refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not create NCs');
    } finally {
      setNcBusy(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Loading report…" pageTagline="Fetching evaluation details.">
        <div className="h-1 w-full animate-pulse rounded bg-[var(--brand-primary)]/30" />
      </DashboardLayout>
    );
  }

  if (!ev) {
    return (
      <PlaceholderRoutePage
        title="Report not found"
        description="This evaluation may have been removed or the link is outdated. Check the reports list to find other evaluations."
        backHref="/evaluations"
        backLabel="Back to evaluations"
        secondaryHref="/dashboard"
        secondaryLabel="Dashboard"
      />
    );
  }

  const rawResults: any[] = Array.isArray(ev.results) ? ev.results : [];
  const results = rawResults.map(normalizeEvalRow);
  const conformant = results.filter((r) => r.status === 'CONFORMANT' || r.status === 'SATISFIED').length;
  const minor = results.filter((r) => r.status === 'MINOR_NC' || r.status === 'PARTIALLY_SATISFIED').length;
  const major = results.filter((r) => r.status === 'MAJOR_NC' || r.status === 'NOT_SATISFIED').length;
  const critical = results.filter((r) => r.status === 'CRITICAL_NC').length;
  const na = results.filter((r) => r.status === 'N/A').length;

  const pair = formatEvaluationPair(ev, isoNorms, products, tenantDocs);

  const completed = ev.status === 'COMPLETED';
  const failed = ev.status === 'FAILED';
  const running = ev.status === 'QUEUED' || ev.status === 'PROCESSING';
  const ncDrafts: any[] = Array.isArray(ev.ncDrafts) ? ev.ncDrafts : [];
  const overrideLog: any[] = Array.isArray(ev.overrideAudit) ? ev.overrideAudit : [];

  return (
    <DashboardLayout
      pageTitle={`Report · ${ev.isoStandard}`}
      pageTagline={
        failed
          ? `The AI service reported an error; your inputs are kept for retry. · ${pair.summary}`
          : running
            ? `Evaluation is running — this page refreshes automatically. · ${pair.summary}`
            : `Review clause-level results, overrides, and exports when you are ready. · ${pair.summary}`
      }
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/evaluations')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-sm text-[var(--muted)]">
              {ev.isoStandard} · {format(new Date(ev.createdAt), 'MMMM d, yyyy HH:mm')}
            </p>
            <p className="mt-1 max-w-xl text-xs leading-snug text-[var(--muted)]" title={pair.summary}>
              <span className="font-semibold text-[var(--text-primary)]">ISO</span> {pair.isoLine}
              <span className="mx-1.5 text-[var(--border)]">|</span>
              <span className="font-semibold text-[var(--text-primary)]">Product</span> {pair.productLine}
            </p>
            <Badge variant="default" className="mt-1 h-6 text-[10px]">
              {running && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
              {ev.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {failed && (
            <Button variant="default" className="gap-2" title={pair.summary} onClick={handleRetry} disabled={retryBusy}>
              <RefreshCw className={cn('h-4 w-4', retryBusy && 'animate-spin')} />
              Retry evaluation
            </Button>
          )}
          {completed && (
            <>
              <Button variant="outline" className="gap-2" onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {failed && (
        <Card className="alert-surface-danger mb-6 shadow-none">
          <p className="font-bold">Evaluation failed</p>
          <p className="mt-1 whitespace-pre-wrap">{ev.errorMessage || 'The compliance engine returned an error.'}</p>
          <p className="mt-2 text-xs opacity-90">
            Submitted standard and evidence references are stored with this job; use Retry to run again without re-uploading.
          </p>
        </Card>
      )}

      {running && (
        <div className="mb-6">
          <AgentActivityPanel
            evaluationId={id}
            enabled={running}
            onDone={() => {
              refresh().catch(() => {});
            }}
          />
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            You may leave this page; the agent keeps working and the report list also updates.
          </p>
        </div>
      )}

      {completed && ncDrafts.length > 0 && (
        <Card className="alert-surface-warning mb-6 shadow-none">
          <p className="font-bold">NC drafts from &ldquo;Not satisfied&rdquo; clauses</p>
          <p className="mt-1 text-sm">
            {ncDrafts.length} draft record(s) are ready. Nothing is saved until you confirm.
          </p>
          <ul className="mt-2 max-h-32 list-inside list-disc overflow-y-auto text-xs opacity-90">
            {ncDrafts.map((d: any, i: number) => (
              <li key={i}>
                {ncDraftListTitle(d)} — {String(d.description || '').slice(0, 120)}
                {String(d.description || '').length > 120 ? '…' : ''}
              </li>
            ))}
          </ul>
          {canConfirmNc && (
            <Button className="mt-3" size="sm" onClick={() => setNcDialogOpen(true)}>
              Review and confirm NC creation
            </Button>
          )}
        </Card>
      )}

      {completed && overrideLog.length > 0 && (
        <Card className="mb-6 border-[var(--border)] p-4 text-sm shadow-none">
          <p className="font-bold text-[var(--text-primary)]">Override audit log</p>
          <ul className="mt-2 space-y-2 text-xs text-[var(--muted)]">
            {overrideLog.map((e: any, i: number) => (
              <li key={i}>
                <span className="font-mono text-[var(--text-primary)]">{e.clauseReference}</span>
                {' → '}
                {String(e.verdict || '').replace(/_/g, ' ')} by {e.userId?.slice?.(0, 8) ?? e.userId} — {e.reason}
                {e.at ? ` (${format(new Date(e.at), 'PPp')})` : ''}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog open={ncDialogOpen} onOpenChange={setNcDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create non-conformities from drafts?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--muted)]">
            This will create {ncDrafts.length} open NC record(s) linked to this evaluation. You can edit them later under
            Non-conformities.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => setNcDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmNc} disabled={ncBusy}>
              {ncBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm and save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!failed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-[var(--border)] p-6 shadow-none">
            <div className="grid gap-6 md:grid-cols-12 md:items-center">
              <div className="text-center md:col-span-3">
                <ScoreGauge score={completed ? ev.conformityScore ?? 0 : 0} />
                <p className="mt-2 text-xs text-[var(--muted)]">Overall conformity score</p>
                {!completed && <p className="mt-1 text-[10px] text-[var(--muted)]">Available when complete</p>}
              </div>
              <div className="md:col-span-9">
                {ev.summary && completed && (
                  <p className="mb-4 rounded-lg bg-[var(--nav-hover)] p-4 text-sm italic text-[var(--text-primary)]">{ev.summary}</p>
                )}
                {completed && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <StatCard label="Conformant" value={conformant} tone="pass" />
                    <StatCard label="Minor NC" value={minor} tone="minor" />
                    <StatCard label="Major NC" value={major} tone="major" />
                    <StatCard label="Critical" value={critical} tone="critical" />
                    <StatCard label="N/A" value={na} tone="na" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {!failed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="overflow-hidden border-[var(--border)] shadow-none">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[var(--brand-primary)]" />
                <h2 className="font-bold text-[var(--text-primary)]">Clause-by-clause analysis</h2>
                <span className="text-xs text-[var(--muted)]">({results.length} clauses — click a row to expand)</span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {['Clause #', 'Title & summary', 'Applicable', 'Status', 'Confidence', 'Justification', ''].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-[var(--muted)]">
                      {running ? 'Results will appear here when the job completes.' : 'No clause results available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((row: any, idx: number) => (
                    <ClauseRow
                      key={row.clause_id || idx}
                      row={row}
                      idx={idx}
                      evaluationId={id}
                      canOverride={canOverride}
                      completed={completed}
                      onUpdated={() => refresh().catch(() => toast.error('Refresh failed'))}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
