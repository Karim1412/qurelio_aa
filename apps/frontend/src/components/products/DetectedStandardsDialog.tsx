'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, Check, Loader2 } from '@/components/icons';
import type { ProductStandardRef } from '@/lib/product-standards';

export interface DetectedStandard extends ProductStandardRef {
  /** A matching standard is already registered in the Standards & Regulations Portal. */
  existingInPortal: boolean;
}

interface Props {
  open: boolean;
  standards: DetectedStandard[];
  productName: string;
  isSubmitting: boolean;
  /** Receives the references the user kept checked. */
  onConfirm: (references: string[]) => void;
  onSkip: () => void;
}

/**
 * Shown after the product wizard reads the uploaded documents: lists the standards
 * and regulations the documents cite, so the user can add the ones missing from the
 * Standards & Regulations Portal in one step.
 */
export function DetectedStandardsDialog({ open, standards, productName, isSubmitting, onConfirm, onSkip }: Props) {
  const addable = useMemo(() => standards.filter((s) => !s.existingInPortal), [standards]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Every new standard starts checked: confirming as-is adds all of them.
  useEffect(() => {
    if (open) setSelected(new Set(addable.map((s) => s.value)));
  }, [open, addable]);

  const toggle = (value: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });
  };

  const allChecked = addable.length > 0 && selected.size === addable.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isSubmitting && onSkip()}>
      <DialogContent
        className="flex max-h-[85vh] max-w-2xl flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--brand-primary)]" />
            Standards &amp; regulations found in the documents
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            The documents of <span className="font-medium">{productName || 'this product'}</span> cite{' '}
            {standards.length} standard{standards.length > 1 ? 's' : ''} or regulation{standards.length > 1 ? 's' : ''}.
            Confirm to add the selected ones to the Standards &amp; Regulations Portal, linked to this product.
          </DialogDescription>
        </DialogHeader>

        {addable.length > 1 && (
          <label className="flex cursor-pointer items-center gap-2 px-1 text-[13px] font-medium text-[var(--text-primary)]">
            <Checkbox
              checked={allChecked}
              onCheckedChange={(v) => setSelected(v === true ? new Set(addable.map((s) => s.value)) : new Set())}
              disabled={isSubmitting}
            />
            Select all ({addable.length})
          </label>
        )}

        <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
          {standards.map((s) => (
            <label
              key={s.value}
              className={
                s.existingInPortal
                  ? 'flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--nav-hover)]/30 px-4 py-3 opacity-70'
                  : 'flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 transition-colors hover:bg-[var(--nav-hover)]/40'
              }
            >
              {s.existingInPortal ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Checkbox
                  checked={selected.has(s.value)}
                  onCheckedChange={(v) => toggle(s.value, v === true)}
                  disabled={isSubmitting}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]" title={s.value}>{s.value}</p>
                <p className="text-[11px] text-[var(--muted)]">{s.sourceLabel}</p>
              </div>
              {s.existingInPortal && (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                  Already in portal
                </span>
              )}
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onSkip} disabled={isSubmitting}>
            Skip
          </Button>
          <Button
            onClick={() => onConfirm(addable.filter((s) => selected.has(s.value)).map((s) => s.value))}
            disabled={isSubmitting || selected.size === 0}
            className="gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Add {selected.size} to portal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
