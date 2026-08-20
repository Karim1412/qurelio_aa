'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, Search, X } from '@/components/icons';
import { productApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { ApplicabilityReasonModal } from './ApplicabilityReasonModal';
import { hasAssessment, type ApplicabilityProduct } from './applicability-detail';

/** The product record as the applicability screen consumes it. */
type Product = ApplicabilityProduct;

interface AnalysisRow {
  id: string;
  name: string;
  reference: string;
  compliances: string[];
  /** Kept so the modal can reason over the full product record. */
  product: Product;
}

/** Compliance list = the certifications + regulations captured on the product. */
function complianceList(p: Product): string[] {
  const merged = [
    ...(p.requiredCertifications ?? []),
    ...(p.applicableRegulations ?? []),
  ];
  const unique = Array.from(new Set(merged.filter(Boolean)));
  return unique;
}

export default function ApplicabilityPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisRow[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Which compliance chip is open in the reason modal.
  const [detail, setDetail] = useState<{ product: Product; label: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await productApi.list();
        if (!cancelled) setProducts(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) toast.error('Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.reference, p.sku].some((v) => (v ?? '').toLowerCase().includes(q)),
    );
  }, [products, query]);

  const selectedProducts = useMemo(
    () => products.filter((p) => selected.has(p.id)),
    [products, selected],
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Select-all / clear applies to the currently visible (searched) products. */
  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((p) => next.delete(p.id));
      else filtered.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleAnalyze = () => {
    if (selected.size === 0) return;
    setAnalyzing(true);
    setResults(null);
    // Simulated analysis: loader for 5s, then build the applicability table.
    timerRef.current = setTimeout(() => {
      const rows: AnalysisRow[] = products
        .filter((p) => selected.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          reference: p.reference || p.sku || '-',
          compliances: complianceList(p),
          product: p,
        }));
      setResults(rows);
      setAnalyzing(false);
    }, 5000);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-sm text-[var(--muted)]">Loading products…</p>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] py-14 text-center">
          <p className="text-base font-semibold text-[var(--muted)]">No products yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Add products in Products Management to run an applicability analysis.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Product selection */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Select products</h2>
              <p className="text-[13px] text-[var(--muted)]">
                {selected.size} of {products.length} selected
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={selected.size === 0 || analyzing}
              className="gap-2"
            >
              {analyzing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Analyzing…
                </>
              ) : (
                'Analyser'
              )}
            </Button>
          </div>

          <div className="space-y-3 px-5 py-4">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Select products"
                  className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[var(--input-border)] bg-[var(--surface)] px-3 text-left text-sm text-[var(--text-primary)] shadow-sm transition-colors hover:border-[var(--brand-primary)]/50 focus-visible:border-[var(--brand-primary)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,174,239,0.2)]"
                >
                  <span className={selected.size === 0 ? 'text-[var(--muted)]' : undefined}>
                    {selected.size === 0
                      ? 'Select products…'
                      : `${selected.size} product${selected.size > 1 ? 's' : ''} selected`}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${pickerOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"
                onOpenAutoFocus={(e) => {
                  // Keep focus on the search field instead of the first list item.
                  e.preventDefault();
                }}
              >
                <div className="border-b border-[var(--border)] p-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                    <Input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name or reference…"
                      className="h-9 pl-9"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
                  <button
                    type="button"
                    onClick={toggleAllFiltered}
                    disabled={filtered.length === 0}
                    className="text-[12px] font-semibold text-[var(--brand-primary)] disabled:opacity-40"
                  >
                    {allFilteredSelected ? 'Deselect all' : 'Select all'}
                    {query.trim() ? ` (${filtered.length})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    disabled={selected.size === 0}
                    className="text-[12px] font-semibold text-[var(--muted)] disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>

                <div
                  role="listbox"
                  aria-multiselectable
                  className="max-h-64 overflow-y-auto p-1"
                >
                  {filtered.length === 0 ? (
                    <p className="px-3 py-6 text-center text-[13px] text-[var(--muted)]">
                      No product matches “{query}”
                    </p>
                  ) : (
                    filtered.map((p) => {
                      const checked = selected.has(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="option"
                          aria-selected={checked}
                          onClick={() => toggleOne(p.id)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--nav-hover)]/50"
                        >
                          <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                              {p.name}
                            </span>
                            <span className="block truncate font-mono text-[11px] text-[var(--muted)]">
                              {p.reference || p.sku || '-'}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedProducts.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)]/10 py-0.5 pl-2.5 pr-1 text-[11px] font-semibold text-[var(--brand-primary)]"
                  >
                    {p.name}
                    <button
                      type="button"
                      onClick={() => toggleOne(p.id)}
                      aria-label={`Remove ${p.name}`}
                      className="rounded-full p-0.5 transition-colors hover:bg-[var(--brand-primary)]/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loader */}
        {analyzing && (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-12 shadow-sm">
            <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[var(--brand-primary)]/25 border-t-[var(--brand-primary)]" />
            <p className="text-sm font-medium text-[var(--text-primary)]">Analyzing applicability…</p>
            <p className="text-[13px] text-[var(--muted)]">Matching {selected.size} product(s) against the compliance landscape.</p>
          </div>
        )}

        {/* Results */}
        {!analyzing && results && (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Applicability results</h2>
              <p className="text-[13px] text-[var(--muted)]">
                {results.length} product(s) analyzed. Click any compliance to see why it applies to
                that product
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Project name
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Project reference
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    List of compliance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-semibold text-[var(--text-primary)]">{row.name}</TableCell>
                    <TableCell className="font-mono text-sm text-[var(--muted)]">{row.reference}</TableCell>
                    <TableCell>
                      {row.compliances.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {row.compliances.map((c, i) => {
                            const assessed = hasAssessment(row.product, c);
                            return (
                              <button
                                key={`${row.id}-${i}`}
                                type="button"
                                onClick={() => setDetail({ product: row.product, label: c })}
                                title="Why does this apply to this product?"
                                className={
                                  'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-left text-[11px] font-semibold transition-colors ' +
                                  (assessed
                                    ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20'
                                    : 'bg-[var(--surface-muted)] text-[var(--muted)] hover:bg-[var(--nav-hover)]')
                                }
                              >
                                {/* Filled dot = the engine has an assessment for this reference. */}
                                <span
                                  className={
                                    'h-1.5 w-1.5 shrink-0 rounded-full ' +
                                    (assessed
                                      ? 'bg-[var(--brand-primary)]'
                                      : 'border border-[var(--muted)]')
                                  }
                                />
                                <span className="truncate">{c}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--muted)]">No compliance mapped</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout pageTitle="Applicability" pageTagline="Regulatory Monitoring">
      {renderContent()}
      <ApplicabilityReasonModal
        product={detail?.product ?? null}
        label={detail?.label ?? null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      />
    </DashboardLayout>
  );
}
