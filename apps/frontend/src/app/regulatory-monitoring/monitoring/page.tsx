'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Eye, ChevronDown, ChevronUp, Settings } from '@/components/icons';
import { cn } from '@/utils/cn';
import { productApi } from '@/lib/api';
import toast from 'react-hot-toast';
import catalogData from '@/data/regulatory_reference_catalog.json';
import { VersionBenchmarkModal } from './VersionBenchmarkModal';

interface Product {
  id: string;
  name: string;
  reference?: string;
  sku?: string;
}

type LegalStatus = 'INGESTIBLE' | 'REFERENCE_ONLY' | 'USER_UPLOAD';

interface CatalogEntry {
  regulation_id: string;
  reference: string;
  short_code: string;
  title: string;
  aliases: string[];
  type: string;
  authority: string;
  jurisdiction: string;
  country_region: string;
  industry: string[];
  category: string;
  legal_status: LegalStatus;
  engine_capability: string;
  current_version: string;
  source: string;
  source_url: string;
  tags: string[];
}

/** Global reference catalog (regulations, laws & standards), feeds the search typeahead. */
const CATALOG = (catalogData as { catalog: CatalogEntry[] }).catalog;
const SEARCH_LIMIT = 7;

/** First entries of the catalog surfaced as quick-pick checkboxes (no search needed). */
const QUICK_PICKS = CATALOG.slice(0, 7);

/** Lookup by both short_code and full reference so the scan can resolve either label. */
const CATALOG_BY_NAME = new Map<string, CatalogEntry>();
CATALOG.forEach((e) => {
  CATALOG_BY_NAME.set(e.short_code, e);
  CATALOG_BY_NAME.set(e.reference, e);
});

/** Demo-only version overrides so the scan surfaces a few "Update available" rows. */
const VERSION_OVERRIDES: Record<string, { current: string; latest: string }> = {
  'ISO 27001': { current: 'ISO/IEC 27001:2013', latest: 'ISO/IEC 27001:2022' },
  'EU MDR': { current: 'Reg. (EU) 2017/745 (2021)', latest: 'Consolidated 2024' },
  'ICH GCP E6': { current: 'E6(R2)', latest: 'E6(R3), 2025' },
  'EU GMP': { current: 'Annex 1 (2008)', latest: 'Annex 1 revised 2022' },
};

/**
 * Demo-only transition deadlines, same footing as VERSION_OVERRIDES above:
 * illustrative dates so the "Next deadline" tile has something to resolve to.
 * Nothing in the catalog or the API carries a deadline, replace this map when a
 * real transition-date source exists.
 */
const DEMO_DEADLINES: Record<string, string> = {
  'ISO 27001': '2025-10-31',
  'EU GMP': '2026-08-25',
  'ICH GCP E6': '2026-07-23',
  'EU MDR': '2027-03-01',
};

/** Filter the catalog by short_code, reference, title and aliases (EN/FR). */
function searchCatalog(query: string): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CATALOG.filter((e) => {
    const hay = [e.short_code, e.reference, e.title, ...(e.aliases ?? [])]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  }).slice(0, SEARCH_LIMIT);
}

const LEGAL_STATUS_LABEL: Record<LegalStatus, string> = {
  INGESTIBLE: 'AI-analyzed',
  REFERENCE_ONLY: 'Reference only',
  USER_UPLOAD: 'Upload required',
};

const LEGAL_STATUS_CLASS: Record<LegalStatus, string> = {
  INGESTIBLE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  REFERENCE_ONLY: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  USER_UPLOAD: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
};

function versionFor(name: string): { current: string; latest: string } {
  if (VERSION_OVERRIDES[name]) return VERSION_OVERRIDES[name];
  const entry = CATALOG_BY_NAME.get(name);
  if (entry) return { current: entry.current_version, latest: entry.current_version };
  return { current: 'v1.0', latest: 'v1.0' };
}

interface ProjectConfig {
  projectId: string;
  name: string;
  reference: string;
  compliances: string[];
}

interface ScanItem {
  name: string;
  current: string;
  latest: string;
  outdated: boolean;
}

interface ScanRow {
  projectId: string;
  name: string;
  reference: string;
  items: ScanItem[];
}

const SCAN_MS = 5000;

export default function MonitoringPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectId, setProjectId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');

  const [configs, setConfigs] = useState<ProjectConfig[]>([]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanRow[] | null>(null);
  const [modalRow, setModalRow] = useState<ScanRow | null>(null);
  /** Configuration lives in a modal; the page keeps only the KPI row and results. */
  const [configOpen, setConfigOpen] = useState(false);
  /** Projects whose assigned-compliance panel is open. */
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await productApi.list();
        if (!cancelled) setProducts(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) toast.error('Failed to load projects');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const searchResults = useMemo(() => searchCatalog(customInput), [customInput]);

  const addCompliance = (name: string) => {
    const val = name.trim();
    if (!val) return;
    setSelected((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setCustomInput('');
  };

  const removeCompliance = (name: string) => {
    setSelected((prev) => prev.filter((c) => c !== name));
  };

  const toggleCompliance = (name: string) => {
    setSelected((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  /** Enter / Add button: pick the top match, else add the raw text as a custom requirement. */
  const submitSearch = () => {
    if (searchResults.length > 0) addCompliance(searchResults[0].short_code);
    else addCompliance(customInput);
  };

  const upsertCurrent = (list: ProjectConfig[]): ProjectConfig[] => {
    const product = products.find((p) => p.id === projectId);
    if (!product || selected.length === 0) return list;
    const entry: ProjectConfig = {
      projectId: product.id,
      name: product.name,
      reference: product.reference || product.sku || '-',
      compliances: selected,
    };
    const idx = list.findIndex((c) => c.projectId === product.id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = entry;
      return next;
    }
    return [...list, entry];
  };

  const addProjectToScan = () => {
    if (!projectId || selected.length === 0) {
      toast.error('Select a project and at least one compliance');
      return;
    }
    setConfigs((prev) => upsertCurrent(prev));
    setProjectId('');
    setSelected([]);
    toast.success('Project added to scan list');
  };

  const removeConfig = (id: string) => {
    setConfigs((prev) => prev.filter((c) => c.projectId !== id));
  };

  const handleScan = () => {
    // Commit any in-progress selection, then scan the whole config list.
    const working = upsertCurrent(configs);
    if (working.length === 0) {
      toast.error('Add at least one project with compliances to scan');
      return;
    }
    setConfigs(working);
    setProjectId('');
    setSelected([]);
    // Close the config modal so the KPI row and loader are visible while scanning.
    setConfigOpen(false);
    setScanning(true);
    // Clearing results resets the tiles to zero, so the post-scan values land as a
    // visible change rather than replacing an identical number.
    setResults(null);
    setModalRow(null);
    setExpandedProjects(new Set()); // ids from the previous scan no longer apply
    // Static scan: loader then a version-comparison table.
    timerRef.current = setTimeout(() => {
      const rows: ScanRow[] = working.map((c) => ({
        projectId: c.projectId,
        name: c.name,
        reference: c.reference,
        items: c.compliances.map((name) => {
          const v = versionFor(name);
          return { name, current: v.current, latest: v.latest, outdated: v.current !== v.latest };
        }),
      }));
      setResults(rows);
      setScanning(false);
    }, SCAN_MS);
  };

  const selectedProduct = products.find((p) => p.id === projectId);

  /**
   * KPI tiles. Null until a scan completes, which is what makes the row sit at
   * zero on load and fill in when the scan resolves.
   */
  const metrics = useMemo(() => {
    if (!results) return null;
    const names = new Set<string>();
    let outdated = 0;
    results.forEach((r) =>
      r.items.forEach((it) => {
        names.add(it.name);
        if (it.outdated) outdated += 1;
      }),
    );
    const affected = results.filter((r) => r.items.some((it) => it.outdated));
    const upcoming = [...names]
      .filter((n) => DEMO_DEADLINES[n])
      .map((n) => ({ name: n, date: DEMO_DEADLINES[n] }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      regulations: names.size,
      projects: results.length,
      changes: outdated,
      affected: affected.length,
      deadline: upcoming[0] ?? null,
    };
  }, [results]);

  const formatDeadline = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const tiles = [
    {
      label: 'Regulations monitored',
      value: metrics ? String(metrics.regulations) : '0',
      caption: metrics
        ? `Across ${metrics.projects} project${metrics.projects === 1 ? '' : 's'}`
        : 'Run a scan to populate',
      accent: 'bg-teal-500',
      valueClass: 'text-[var(--text-primary)]',
    },
    {
      label: 'Active changes',
      value: metrics ? String(metrics.changes) : '0',
      caption: metrics
        ? metrics.changes > 0
          ? `${metrics.affected} project${metrics.affected === 1 ? '' : 's'} affected`
          : 'Every assigned version is current'
        : 'Run a scan to populate',
      accent: 'bg-rose-500',
      valueClass: metrics && metrics.changes > 0 ? 'text-rose-600' : 'text-[var(--text-primary)]',
    },
    {
      label: 'Pending impact review',
      value: metrics ? String(metrics.affected) : '0',
      caption: metrics ? 'Projects awaiting version review' : 'Run a scan to populate',
      accent: 'bg-amber-500',
      valueClass: metrics && metrics.affected > 0 ? 'text-amber-600' : 'text-[var(--text-primary)]',
    },
    {
      label: 'Next deadline',
      value: metrics?.deadline ? formatDeadline(metrics.deadline.date) : '-',
      caption: metrics
        ? (metrics.deadline?.name ?? 'No deadline tracked for these references')
        : 'Run a scan to populate',
      accent: 'bg-indigo-500',
      valueClass: 'text-[var(--text-primary)]',
    },
  ];

  return (
    <DashboardLayout pageTitle="Monitoring" pageTagline="Regulatory Monitoring">
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-sm text-[var(--muted)]">Loading projects…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── KPI row ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tiles.map((t) => (
              <div
                key={t.label}
                className="flex overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
              >
                {/* Accent rail: the colour is what separates the tiles at a glance. */}
                <span className={cn('w-1 shrink-0', t.accent)} aria-hidden />
                <div className="min-w-0 flex-1 px-4 py-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    {t.label}
                  </p>
                  <p className={cn('mt-1 text-2xl font-extrabold leading-tight', t.valueClass)}>
                    {t.value}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-[var(--muted)]" title={t.caption}>
                    {t.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Configuration entry point ─────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Project &amp; compliance configuration</h2>
              <p className="text-[13px] text-[var(--muted)]">
                {configs.length > 0
                  ? `${configs.length} project${configs.length === 1 ? '' : 's'} queued for scan`
                  : 'Choose a project, assign compliance standards, then run a scan to compare versions.'}
              </p>
            </div>
            <Button type="button" onClick={() => setConfigOpen(true)} className="gap-2" disabled={scanning}>
              <Settings className="h-4 w-4" />
              {scanning ? 'Scanning…' : 'Configure & scan'}
            </Button>
          </div>

          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">Project &amp; compliance configuration</DialogTitle>
                <DialogDescription>
                  Choose a project, assign compliance standards, then run a scan to compare versions.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
              {/* Project selection */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-[var(--text-primary)]">Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                >
                  <option value="">Select a project…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.reference || p.sku ? ` (${p.reference || p.sku})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-compliance assignment: searchable reference catalog */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Assign compliance standards
                </label>

                {/* Quick-pick pills: first entries of the catalog, hidden while searching */}
                {!customInput.trim() && (
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PICKS.map((entry) => {
                      const active = selected.includes(entry.short_code);
                      return (
                        <button
                          key={entry.regulation_id}
                          type="button"
                          onClick={() => toggleCompliance(entry.short_code)}
                          aria-pressed={active}
                          className={
                            'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ' +
                            (active
                              ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                              : 'border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--nav-hover)]/40')
                          }
                        >
                          {entry.short_code}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Search typeahead over the global reference catalog (max 7 results) */}
                <div className="relative max-w-md">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          submitSearch();
                        }
                      }}
                      placeholder="Add a new compliance requirement…"
                      className="flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={submitSearch} className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  {customInput.trim() && searchResults.length === 0 && (
                    <p className="mt-1 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-[12px] text-[var(--muted)]">
                      No match in the reference catalog. Press <span className="font-semibold">Add</span> to create a custom requirement.
                    </p>
                  )}

                  {customInput.trim() && searchResults.length > 0 && (
                    <ul className="z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-sm">
                      {searchResults.map((entry) => {
                        const already = selected.includes(entry.short_code);
                        return (
                          <li key={entry.regulation_id}>
                            <button
                              type="button"
                              disabled={already}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                addCompliance(entry.short_code);
                              }}
                              className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--nav-hover)]/40 disabled:cursor-default disabled:opacity-50"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                                    {entry.short_code}
                                  </span>
                                  <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
                                    {entry.reference}
                                  </span>
                                </div>
                                <p className="truncate text-[12px] text-[var(--muted)]">{entry.title}</p>
                              </div>
                              <span
                                className={
                                  'mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ' +
                                  LEGAL_STATUS_CLASS[entry.legal_status]
                                }
                              >
                                {already ? 'Added' : LEGAL_STATUS_LABEL[entry.legal_status]}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Selected requirements */}
                {selected.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selected.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10 px-3 py-1.5 text-[13px] font-medium text-[var(--brand-primary)]"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => removeCompliance(name)}
                          className="text-[var(--brand-primary)]/70 transition-colors hover:text-red-500"
                          aria-label={`Remove ${name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="pt-1 text-[12px] text-[var(--muted)]">
                    Search the reference catalog (laws, regulations & standards) to assign requirements.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addProjectToScan}
                  disabled={!projectId || selected.length === 0}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add project to scan
                </Button>
                <Button
                  type="button"
                  onClick={handleScan}
                  disabled={scanning || (configs.length === 0 && (!selectedProduct || selected.length === 0))}
                  className="gap-2"
                >
                  {scanning ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Scanning…
                    </>
                  ) : (
                    'Scan'
                  )}
                </Button>
              </div>

              {/* Configured projects */}
              {configs.length > 0 && (
                <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--page-bg)]/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Projects queued for scan ({configs.length})
                  </p>
                  {configs.map((c) => (
                    <div key={c.projectId} className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{c.name}</span>
                      <span className="font-mono text-[11px] text-[var(--muted)]">{c.reference}</span>
                      <div className="flex flex-wrap gap-1">
                        {c.compliances.map((cc) => (
                          <span key={cc} className="rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-primary)]">
                            {cc}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeConfig(c.projectId)}
                        className="ml-auto text-[var(--muted)] transition-colors hover:text-red-500"
                        aria-label={`Remove ${c.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </DialogContent>
          </Dialog>

          {/* ── Loader ────────────────────────────────────────────── */}
          {scanning && (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-12 shadow-sm">
              <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[var(--brand-primary)]/25 border-t-[var(--brand-primary)]" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Scanning compliance versions…</p>
              <p className="text-[13px] text-[var(--muted)]">Comparing current versions against the latest available updates.</p>
            </div>
          )}

          {/* ── Results ───────────────────────────────────────────── */}
          {!scanning && results && (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Scan results</h2>
                <p className="text-[13px] text-[var(--muted)]">{results.length} project(s) scanned</p>
              </div>
              {/* One accordion per project: the header carries the name and the
                  action, the panel holds that project's assigned compliances.
                  Each entry is inset from the card edges and separated by a gap
                  rather than a divider line. */}
              <div className="space-y-3 px-5 pb-5 pt-4">
                {results.map((row) => {
                  const open = expandedProjects.has(row.projectId);
                  const outdatedCount = row.items.filter((it) => it.outdated).length;
                  return (
                    <div
                      key={row.projectId}
                      className="overflow-hidden rounded-xl border border-[var(--border)]"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={open}
                        aria-controls={`compliances-${row.projectId}`}
                        onClick={() => toggleProject(row.projectId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleProject(row.projectId);
                          }
                        }}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-hover',
                          // Every header carries colour so closed rows still read as
                          // accordion headers; the open one deepens against its
                          // plain white panel. Amber flags outdated versions.
                          open
                            ? 'bg-[var(--brand-primary)]/15'
                            : outdatedCount > 0
                              ? 'bg-amber-500/[0.10] hover:bg-amber-500/[0.16]'
                              : 'bg-[var(--brand-primary)]/[0.06] hover:bg-[var(--brand-primary)]/[0.12]',
                        )}
                      >
                        {open ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[var(--text-primary)]">{row.name}</p>
                          <p className="truncate font-mono text-[11px] text-[var(--muted)]">{row.reference}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-[var(--muted)]">
                          {row.items.length} compliance{row.items.length === 1 ? '' : 's'}
                          {outdatedCount > 0 && (
                            <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                              {outdatedCount} update{outdatedCount === 1 ? '' : 's'}
                            </span>
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          // Must not toggle the panel: this opens the benchmark modal.
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalRow(row);
                          }}
                          className="ml-1 shrink-0 gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </div>

                      {open && (
                        <div id={`compliances-${row.projectId}`} className="max-w-full overflow-x-auto bg-[var(--surface)] px-5 pb-4 pt-1">
                          <Table className="min-w-[620px]">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="bg-transparent text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Assigned compliance(s)</TableHead>
                                <TableHead className="bg-transparent text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Current version</TableHead>
                                <TableHead className="bg-transparent text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Latest version</TableHead>
                                <TableHead className="bg-transparent text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {row.items.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="py-6 text-center text-sm text-[var(--muted)]">
                                    No compliance assigned to this project.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                row.items.map((it) => (
                                  <TableRow key={it.name}>
                                    <TableCell className="text-sm font-medium text-[var(--text-primary)]">{it.name}</TableCell>
                                    <TableCell className="font-mono text-[13px] text-[var(--muted)]">{it.current}</TableCell>
                                    <TableCell className="font-mono text-[13px] text-[var(--text-primary)]">{it.latest}</TableCell>
                                    <TableCell>
                                      {it.outdated ? (
                                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">Update</span>
                                      ) : (
                                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Up to date</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Version Benchmark modal ─────────────────────────────── */}
      <VersionBenchmarkModal row={modalRow} onOpenChange={(v) => !v && setModalRow(null)} />
    </DashboardLayout>
  );
}
