'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, LineChart } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { documentApi, evaluationApi, productApi } from '@/lib/api';
import { parseClauseRefListToWeights } from '@/lib/evaluation-clause-refs';
import { formatIsoNormSelectLabel } from '@/lib/file-library-helpers';
import { useAuthStore } from '@/lib/auth-store';

interface RunEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

interface IsoNormOption {
  id: string;
  isoStandard?: string | null;
  name?: string | null;
}

interface ProductDocOption {
  id: string;
  name?: string | null;
  fileName?: string | null;
  productId?: string | null;
  type?: string | null;
}

interface ProductOption {
  id: string;
  name?: string | null;
}

function apiMessage(err: unknown, fallback: string): string {
  const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m.join(' ') : m || fallback;
}

function productDocLabel(d: ProductDocOption, products: ProductOption[]): string {
  const file = d.name?.trim() || d.fileName?.trim() || '—';
  const productName = products.find((p) => p.id === d.productId)?.name?.trim();
  return productName ? `${productName} · ${file}` : file;
}

export function RunEvaluationDialog({ open, onOpenChange, onCreated }: RunEvaluationDialogProps) {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isoNorms, setIsoNorms] = useState<IsoNormOption[]>([]);
  const [productDocs, setProductDocs] = useState<ProductDocOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [isoDocumentId, setIsoDocumentId] = useState('');
  const [productDocumentId, setProductDocumentId] = useState('');
  const [clauseRefsList, setClauseRefsList] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [normsRes, docsRes, prodsRes] = await Promise.all([
          documentApi.getIsoNorms(),
          documentApi.list(),
          productApi.list(),
        ]);
        if (cancelled) return;
        setIsoNorms(Array.isArray(normsRes.data) ? (normsRes.data as IsoNormOption[]) : []);
        const allDocs = Array.isArray(docsRes.data) ? (docsRes.data as ProductDocOption[]) : [];
        setProductDocs(
          allDocs.filter((d) => d.type === 'PRODUCT_DOC' || (!!d.productId && d.type !== 'ISO_NORM')),
        );
        setProducts(Array.isArray(prodsRes.data) ? (prodsRes.data as ProductOption[]) : []);
      } catch (err) {
        if (!cancelled) toast.error(apiMessage(err, 'Failed to load options'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const reset = () => {
    setIsoDocumentId('');
    setProductDocumentId('');
    setClauseRefsList('');
  };

  const handleClose = (next: boolean) => {
    if (creating) return;
    onOpenChange(next);
    if (!next) setTimeout(reset, 220);
  };

  const onSubmit = async () => {
    if (!isoDocumentId || !productDocumentId) {
      toast.error('Select a standard and a product document');
      return;
    }
    setCreating(true);
    try {
      const norm = isoNorms.find((n) => n.id === isoDocumentId);
      const productDoc = productDocs.find((d) => d.id === productDocumentId);
      const product = products.find((p) => p.id === productDoc?.productId);
      await evaluationApi.create({
        isoDocumentId,
        productDocumentId,
        isoStandard: norm?.isoStandard ?? norm?.name ?? '',
        productName: typeof product?.name === 'string' ? product.name : undefined,
        evaluationMetadata: {
          standardReference: norm?.isoStandard?.trim() || norm?.name?.trim() || null,
          standardTitle:
            norm?.name?.trim() && norm?.isoStandard?.trim() && norm.name.trim() !== norm.isoStandard.trim()
              ? norm.name.trim()
              : null,
          standardName: norm?.name ?? norm?.isoStandard ?? null,
          isoStandard: norm?.isoStandard ?? norm?.name ?? null,
          productName: product?.name ?? null,
          productId: product?.id ?? productDoc?.productId ?? null,
          productDocumentName: productDoc?.name ?? productDoc?.fileName ?? null,
          companyName: user?.company?.name?.trim() || null,
        },
        reportContext: {
          company: {
            companyName: user?.company?.name?.trim() || '',
            address: (user?.company as { field?: string } | undefined)?.field?.trim() || '',
            email: '',
            phone: user?.phone?.trim() || '',
          },
          initiator: {
            firstName: user?.firstName?.trim() || '',
            lastName: user?.lastName?.trim() || '',
            email: user?.email?.trim() || '',
          },
        },
        clauseWeights: parseClauseRefListToWeights(clauseRefsList),
      });
      toast.success('Evaluation queued — visible on the Compliance engine page');
      onCreated?.();
      onOpenChange(false);
      setTimeout(reset, 220);
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to create evaluation'));
    } finally {
      setCreating(false);
    }
  };

  const canSubmit = !loading && !creating && !!isoDocumentId && !!productDocumentId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Run a new evaluation</DialogTitle>
          <DialogDescription>
            Pick the standard and the product document to compare. Clauses are optional.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
            <p className="text-xs text-[var(--muted)]">Loading documents…</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <Label>Standard document</Label>
              <Select value={isoDocumentId} onValueChange={setIsoDocumentId} disabled={creating}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a standard" />
                </SelectTrigger>
                <SelectContent>
                  {isoNorms.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-[var(--muted)]">
                      No active standards yet. Activate one from the file library.
                    </div>
                  ) : (
                    isoNorms.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {formatIsoNormSelectLabel(n)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Product document</Label>
              <Select
                value={productDocumentId}
                onValueChange={setProductDocumentId}
                disabled={creating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product document" />
                </SelectTrigger>
                <SelectContent>
                  {productDocs.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-[var(--muted)]">
                      No product documents yet. Upload one from the file library.
                    </div>
                  ) : (
                    productDocs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {productDocLabel(d, products)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="run-eval-clauses">Optional clauses</Label>
              <Input
                id="run-eval-clauses"
                value={clauseRefsList}
                onChange={(e) => setClauseRefsList(e.target.value)}
                placeholder="e.g. 4.1, 4.2.1, 6.3"
                disabled={creating}
                autoComplete="off"
              />
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Comma-separated clause refs. Leave blank to evaluate all.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit} className="gap-2">
            <LineChart className="h-4 w-4" />
            {creating ? 'Starting…' : 'Start evaluation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
