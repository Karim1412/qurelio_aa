'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Check, Trash2, FileText, History } from '@/components/icons';
import { Stepper, type Step } from '@/components/company/Stepper';
import { ProductStepIdentity, type ProductIdentityData } from '@/components/products/ProductStepIdentity';
import { ProductStepTechnical, type ProductTechnicalData } from '@/components/products/ProductStepTechnical';
import { ProductStepMarkets, type ProductMarketsData } from '@/components/products/ProductStepMarkets';
import { ProductStepManufacturing, type ProductManufacturingData } from '@/components/products/ProductStepManufacturing';
import { ProductStepCertifications, type ProductCertificationsData } from '@/components/products/ProductStepCertifications';
import { ProductStepDocuments, type ProductDocumentsData } from '@/components/products/ProductStepDocuments';
import { productApi, documentApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STEPS: Step[] = [
  { label: 'Identity', subtitle: 'Product name & type' },
  { label: 'Technical', subtitle: 'Use, materials, HS code' },
  { label: 'Markets', subtitle: 'Target regions & regulations' },
  { label: 'Manufacturing', subtitle: 'Sites & suppliers' },
  { label: 'Certifications', subtitle: 'Product-level certs' },
  { label: 'Documents', subtitle: 'Upload files' },
];

const DRAFTS_LS_KEY = 'qurelio-product-drafts';
const AUTOSAVE_LS_KEY = 'qurelio-product-wizard-autosave';

interface DraftEntry {
  id: string;
  name: string;
  step: number;
  completedSteps: number[];
  productId: string | null;
  identity: ProductIdentityData;
  technical: ProductTechnicalData;
  markets: ProductMarketsData;
  manufacturing: ProductManufacturingData;
  certifications: ProductCertificationsData;
  savedAt: number;
}

function loadDrafts(): DraftEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DRAFTS_LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DraftEntry[];
  } catch { return []; }
}

function saveDrafts(drafts: DraftEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFTS_LS_KEY, JSON.stringify(drafts));
  } catch { /* ignore */ }
}

function loadAutosave(): DraftEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTOSAVE_LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftEntry;
  } catch { return null; }
}

function saveAutosave(state: DraftEntry) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTOSAVE_LS_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function clearAutosave() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(AUTOSAVE_LS_KEY); } catch { /* ignore */ }
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  onExtractionStarted?: (ids: string[]) => void;
  companySites?: string[];
  companyProcesses?: string[];
  /** When set, the wizard opens in edit mode pre-filled with this product's saved profile. */
  editProduct?: any | null;
}

const IDENTITY_EMPTY: ProductIdentityData = {
  name: '', sku: '', brandName: '', productFamily: '', category: '',
  productType: 'finished', description: '', productStatus: 'active',
};
const TECHNICAL_EMPTY: ProductTechnicalData = {
  intendedUse: '', targetUsers: [], keyMaterials: [],
  physicalForm: '', hsTariffCode: '', countryOfOrigin: '',
};
const MARKETS_EMPTY: ProductMarketsData = {
  targetMarkets: [], requiredCertifications: [], applicableRegulations: [], industryLabels: [],
};
const MANUFACTURING_EMPTY: ProductManufacturingData = {
  productionSites: [], productionProcesses: [], criticalSuppliers: [],
};
const CERTIFICATIONS_EMPTY: ProductCertificationsData = {
  productCertifications: [],
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function makeEmptyDraft(): DraftEntry {
  return {
    id: generateId(),
    name: '',
    step: 0,
    completedSteps: [],
    productId: null,
    identity: { ...IDENTITY_EMPTY },
    technical: { ...TECHNICAL_EMPTY },
    markets: { ...MARKETS_EMPTY },
    manufacturing: { ...MANUFACTURING_EMPTY },
    certifications: { ...CERTIFICATIONS_EMPTY },
    savedAt: Date.now(),
  };
}

export function ProductWizard({ open, onClose, onCreated, onExtractionStarted, companySites, companyProcesses, editProduct }: Props) {
  const isEditMode = !!editProduct;
  const [view, setView] = useState<'wizard' | 'drafts'>('wizard');

  // Try to load autosave on open (create flow only — edit mode hydrates from the product instead)
  const autosave = open && view === 'wizard' && !isEditMode ? loadAutosave() : null;

  const [step, setStep] = useState(autosave?.step ?? 0);
  const [completedSteps, setCompletedSteps] = useState<number[]>(autosave?.completedSteps ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [productId, setProductId] = useState<string | null>(autosave?.productId ?? null);
  const [draftName, setDraftName] = useState(autosave?.name ?? '');

  const [identity, setIdentity] = useState<ProductIdentityData>(autosave?.identity ?? IDENTITY_EMPTY);
  const [technical, setTechnical] = useState<ProductTechnicalData>(autosave?.technical ?? TECHNICAL_EMPTY);
  const [markets, setMarkets] = useState<ProductMarketsData>(autosave?.markets ?? MARKETS_EMPTY);
  const [manufacturing, setManufacturing] = useState<ProductManufacturingData>(autosave?.manufacturing ?? MANUFACTURING_EMPTY);
  const [certifications, setCertifications] = useState<ProductCertificationsData>(autosave?.certifications ?? CERTIFICATIONS_EMPTY);
  const [documents, setDocuments] = useState<ProductDocumentsData>({ files: [] });

  // Persist autosave whenever state changes (create flow only — never pollute the create draft with an edit)
  useEffect(() => {
    if (!open || view !== 'wizard' || isEditMode) return;
    saveAutosave({
      id: autosave?.id ?? generateId(),
      name: draftName,
      step, completedSteps, productId,
      identity, technical, markets, manufacturing, certifications,
      savedAt: Date.now(),
    });
  }, [open, view, isEditMode, step, completedSteps, productId, identity, technical, markets, manufacturing, certifications, draftName]);

  // Edit mode: hydrate every step from the existing product when the dialog opens.
  useEffect(() => {
    if (!open || !editProduct) return;
    setView('wizard');
    setProductId(editProduct.id);
    setDraftName(editProduct.name ?? '');
    setStep(0);
    setCompletedSteps([0, 1, 2, 3, 4, 5]);
    setIdentity({
      name: editProduct.name ?? '',
      sku: editProduct.sku ?? '',
      brandName: editProduct.brandName ?? '',
      productFamily: editProduct.productFamily ?? '',
      category: editProduct.categoryTags?.[0] ?? '',
      productType: editProduct.productType ?? 'finished',
      description: editProduct.description ?? '',
      productStatus: editProduct.productStatus ?? 'active',
    });
    setTechnical({
      intendedUse: editProduct.intendedUse ?? '',
      targetUsers: editProduct.targetUsers ?? [],
      keyMaterials: editProduct.keyMaterials ?? [],
      physicalForm: editProduct.physicalForm ?? '',
      hsTariffCode: editProduct.hsTariffCode ?? '',
      countryOfOrigin: editProduct.countryOfOrigin ?? '',
    });
    setMarkets({
      targetMarkets: editProduct.targetMarkets ?? [],
      requiredCertifications: editProduct.requiredCertifications ?? [],
      applicableRegulations: editProduct.applicableRegulations ?? [],
      industryLabels: editProduct.industryLabels ?? [],
    });
    setManufacturing({
      productionSites: editProduct.productionSites ?? [],
      productionProcesses: editProduct.productionProcesses ?? [],
      criticalSuppliers: editProduct.criticalSuppliers ?? [],
    });
    setCertifications({
      productCertifications: editProduct.productCertifications ?? [],
    });
    setDocuments({ files: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editProduct?.id]);

  const validateStep = useCallback((s: number): boolean => {
    switch (s) {
      case 0:
        if (!identity.name.trim()) { toast.error('Product name is required'); return false; }
        if (!identity.productType) { toast.error('Product type is required'); return false; }
        if (!identity.productStatus) { toast.error('Product status is required'); return false; }
        return true;
      case 1:
        if (!technical.intendedUse.trim()) { toast.error('Intended use is required'); return false; }
        if (technical.targetUsers.length === 0) { toast.error('Select at least one target user'); return false; }
        return true;
      case 2:
        if (markets.targetMarkets.length === 0) { toast.error('Select at least one target market'); return false; }
        return true;
      default:
        return true;
    }
  }, [identity, technical, markets]);

  const ensureProduct = async (): Promise<string> => {
    if (productId) return productId;
    const res = await productApi.create({ name: identity.name, description: identity.description || undefined, sku: identity.sku || undefined });
    const id = res.data.id;
    setProductId(id);
    return id;
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;
    setIsSaving(true);
    try {
      const id = await ensureProduct();
      await saveStep(id);
      setCompletedSteps((prev) => [...new Set([...prev, step])]);
      setStep((p) => Math.min(p + 1, STEPS.length - 1));
    } catch { toast.error('Failed to save'); }
    finally { setIsSaving(false); }
  };

  const handleBack = () => {
    setStep((p) => Math.max(p - 1, 0));
  };

  const saveStep = async (id: string) => {
    const data: Record<string, any> = { currentStep: step, onboardingStatus: 'IN_PROGRESS' };
    switch (step) {
      case 0:
        data.name = identity.name;
        data.sku = identity.sku || undefined;
        data.brandName = identity.brandName || undefined;
        data.productFamily = identity.productFamily || undefined;
        data.description = identity.description || undefined;
        data.productType = identity.productType;
        data.productStatus = identity.productStatus;
        break;
      case 1:
        data.intendedUse = technical.intendedUse;
        data.targetUsers = technical.targetUsers;
        data.keyMaterials = technical.keyMaterials;
        data.physicalForm = technical.physicalForm || undefined;
        data.hsTariffCode = technical.hsTariffCode || undefined;
        data.countryOfOrigin = technical.countryOfOrigin || undefined;
        break;
      case 2:
        data.targetMarkets = markets.targetMarkets;
        data.requiredCertifications = markets.requiredCertifications;
        data.applicableRegulations = markets.applicableRegulations;
        data.industryLabels = markets.industryLabels;
        break;
      case 3:
        data.productionSites = manufacturing.productionSites;
        data.productionProcesses = manufacturing.productionProcesses;
        data.criticalSuppliers = manufacturing.criticalSuppliers;
        break;
      case 4:
        data.productCertifications = certifications.productCertifications;
        break;
    }
    await productApi.updateProfile(id, data);
  };

  const handleSaveAndDraft = async () => {
    const name = draftName.trim() || identity.name.trim() || `Draft — ${new Date().toLocaleDateString()}`;
    setIsSaving(true);
    try {
      const id = await ensureProduct();
      await saveStep(id);

      const entry: DraftEntry = {
        id: autosave?.id ?? generateId(),
        name,
        step,
        completedSteps,
        productId: id,
        identity,
        technical,
        markets,
        manufacturing,
        certifications,
        savedAt: Date.now(),
      };

      const drafts = loadDrafts();
      const existing = drafts.findIndex((d) => d.id === entry.id);
      if (existing >= 0) {
        drafts[existing] = entry;
      } else {
        drafts.unshift(entry);
      }
      saveDrafts(drafts);
      clearAutosave();
      toast.success('Draft saved');
      handleClose();
    } catch { toast.error('Failed to save'); }
    finally { setIsSaving(false); }
  };

  const handleResumeDraft = (draft: DraftEntry) => {
    setStep(draft.step);
    setCompletedSteps(draft.completedSteps);
    setProductId(draft.productId);
    setDraftName(draft.name);
    setIdentity(draft.identity);
    setTechnical(draft.technical);
    setMarkets(draft.markets);
    setManufacturing(draft.manufacturing);
    setCertifications(draft.certifications);
    setDocuments({ files: [] });
    setView('wizard');
  };

  const handleDeleteDraft = (draftId: string) => {
    const drafts = loadDrafts().filter((d) => d.id !== draftId);
    saveDrafts(drafts);
    toast.success('Draft deleted');
  };

  const handleComplete = async () => {
    if (!validateStep(step)) return;
    setIsSaving(true);
    try {
      const id = await ensureProduct();
      await saveStep(id);

      const uploadedIds: string[] = [];
      for (const f of documents.files) {
        const fd = new FormData();
        fd.append('file', f.file);
        fd.append('type', 'PRODUCT_DOC');
        fd.append('productName', identity.name);
        try {
          const res = await documentApi.upload(fd);
          if (res.data?.id) uploadedIds.push(res.data.id);
        } catch { /* continue with other files */ }
      }

      await productApi.completeProduct(id);

      if (uploadedIds.length > 0) {
        onExtractionStarted?.(uploadedIds);
      }

      // Remove draft if it existed
      if (autosave) {
        const drafts = loadDrafts().filter((d) => d.id !== autosave.id);
        saveDrafts(drafts);
        clearAutosave();
      }

      toast.success(uploadedIds.length > 0
        ? `Product ${isEditMode ? 'updated' : 'activated'} — ${uploadedIds.length} file${uploadedIds.length > 1 ? 's' : ''} sent for AI extraction`
        : isEditMode ? 'Product updated successfully!' : 'Product activated successfully!');
      handleClose();
      onCreated?.();
    } catch { toast.error('Failed to complete'); }
    finally { setIsSaving(false); }
  };

  const handleClose = () => {
    setStep(0);
    setCompletedSteps([]);
    setProductId(null);
    setDraftName('');
    setIdentity(IDENTITY_EMPTY);
    setTechnical(TECHNICAL_EMPTY);
    setMarkets(MARKETS_EMPTY);
    setManufacturing(MANUFACTURING_EMPTY);
    setCertifications(CERTIFICATIONS_EMPTY);
    setDocuments({ files: [] });
    setView('wizard');
    onClose();
  };

  const isLast = step === STEPS.length - 1;

  const renderStep = () => {
    switch (step) {
      case 0: return <ProductStepIdentity data={identity} onChange={(d) => setIdentity((p) => ({ ...p, ...d }))} />;
      case 1: return <ProductStepTechnical data={technical} onChange={(d) => setTechnical((p) => ({ ...p, ...d }))} />;
      case 2: return <ProductStepMarkets data={markets} onChange={(d) => setMarkets((p) => ({ ...p, ...d }))} />;
      case 3: return <ProductStepManufacturing data={manufacturing} companySites={companySites} companyProcesses={companyProcesses} onChange={(d) => setManufacturing((p) => ({ ...p, ...d }))} />;
      case 4: return <ProductStepCertifications data={certifications} onChange={(d) => setCertifications((p) => ({ ...p, ...d }))} />;
      case 5: return <ProductStepDocuments data={documents} onChange={(d) => setDocuments((p) => ({ ...p, ...d }))} />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col overflow-hidden p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
          <DialogHeader className="flex-1">
            <DialogTitle className="text-lg font-bold">
              {view === 'drafts' ? 'Product Drafts' : isEditMode ? 'Edit Product' : productId ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              {view === 'drafts' ? 'Resume a saved draft or start fresh' : 'Fill in product details across all steps'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            {view === 'wizard' && (
              <>
                {!isEditMode && (
                  <Button variant="ghost" size="sm" onClick={() => setView('drafts')} className="gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    Drafts
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleClose} disabled={isSaving}>Cancel</Button>
                {!isEditMode && (
                  <Button variant="outline" size="sm" onClick={handleSaveAndDraft} disabled={isSaving}>Save as draft</Button>
                )}
              </>
            )}
            {view === 'drafts' && (
              <Button variant="outline" size="sm" onClick={() => setView('wizard')}>Back to wizard</Button>
            )}
          </div>
        </div>

        {view === 'wizard' ? (
          <>
            {/* Stepper */}
            <div className="border-b border-[var(--border)] px-6 py-4">
              <Stepper steps={STEPS} currentStep={step} completedSteps={completedSteps} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {renderStep()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3">
              <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                <Check className="h-4 w-4 text-emerald-500" />Progress saved automatically
              </div>
              <div className="flex items-center gap-3">
                {step > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleBack} disabled={isSaving} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />Previous
                  </Button>
                )}
                <Button size="sm" onClick={isLast ? handleComplete : handleNext} disabled={isSaving} className="gap-2">
                  {isLast ? <><Check className="h-4 w-4" />{isEditMode ? 'Save changes' : 'Save & activate'}</> : <>Next<ArrowRight className="h-4 w-4" /></>}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <DraftsPanel
            drafts={loadDrafts()}
            onResume={handleResumeDraft}
            onDelete={handleDeleteDraft}
            onStartNew={() => { clearAutosave(); setView('wizard'); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DraftsPanel({
  drafts,
  onResume,
  onDelete,
  onStartNew,
}: {
  drafts: DraftEntry[];
  onResume: (d: DraftEntry) => void;
  onDelete: (id: string) => void;
  onStartNew: () => void;
}) {
  if (drafts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--nav-hover)]">
          <FileText className="h-7 w-7 text-[var(--muted)]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">No saved drafts</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Save your progress as a draft to resume later</p>
        </div>
        <Button size="sm" onClick={onStartNew} className="gap-2">
          <ArrowRight className="h-3.5 w-3.5" />
          Start new product
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{drafts.length} saved draft{drafts.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={onStartNew} className="gap-2">
          <ArrowRight className="h-3.5 w-3.5" />
          New product
        </Button>
      </div>
      <div className="space-y-2">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--nav-hover)]/20 px-5 py-4 transition-colors hover:bg-[var(--nav-hover)]/40"
          >
            {/* Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
              <FileText className="h-5 w-5" />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {draft.name || 'Untitled product'}
              </p>
              <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <History className="h-3 w-3" />
                  {new Date(draft.savedAt).toLocaleDateString()} {new Date(draft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>Step {draft.step + 1} of {STEPS.length}</span>
                <span className="rounded-full bg-[var(--brand-primary)]/8 px-2 py-0.5 text-[10px] font-medium text-[var(--brand-primary)]">
                  {STEPS[draft.step]?.label}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" onClick={() => onResume(draft)} className="gap-1.5">
                Resume
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[var(--muted)] hover:text-red-500 hover:bg-red-50"
                onClick={() => onDelete(draft.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
