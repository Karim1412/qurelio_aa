'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { productApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  reference?: string;
  sku?: string;
  requiredCertifications?: string[];
  applicableRegulations?: string[];
  categoryTags?: string[];
}

interface AnalysisRow {
  id: string;
  name: string;
  reference: string;
  compliances: string[];
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

  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === products.length ? new Set() : new Set(products.map((p) => p.id)),
    );
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
          reference: p.reference || p.sku || '—',
          compliances: complianceList(p),
        }));
      setResults(rows);
      setAnalyzing(false);
    }, 5000);
  };

  const selectAllRef = useRef<HTMLButtonElement>(null);

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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[52px]">
                  <Checkbox
                    ref={selectAllRef}
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all products"
                  />
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Product name
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Reference
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer transition-colors hover:bg-[var(--nav-hover)]/40"
                    onClick={() => toggleOne(p.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleOne(p.id)}
                        aria-label={`Select ${p.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-[var(--text-primary)]">{p.name}</TableCell>
                    <TableCell className="font-mono text-sm text-[var(--muted)]">
                      {p.reference || p.sku || '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
              <p className="text-[13px] text-[var(--muted)]">{results.length} product(s) analyzed</p>
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
                          {row.compliances.map((c, i) => (
                            <span
                              key={`${row.id}-${i}`}
                              className="inline-flex items-center rounded-full bg-[var(--brand-primary)]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--brand-primary)]"
                            >
                              {c}
                            </span>
                          ))}
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
    </DashboardLayout>
  );
}
