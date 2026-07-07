'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Stepper, type Step } from '@/components/company/Stepper';
import { StepIdentity, type CompanyIdentityData } from '@/components/company/StepIdentity';
import { StepActivity, type ActivityProductsData } from '@/components/company/StepActivity';
import { StepMarkets, type MarketsComplianceData } from '@/components/company/StepMarkets';
import { StepQuality, type QualityTeamData } from '@/components/company/StepQuality';
import { CompanyProfileView } from '@/components/company/CompanyProfileView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, Download } from '@/components/icons';
import { companyProfileApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STEPS: Step[] = [
  { label: 'Company Identity', subtitle: 'Legal info & location' },
  { label: 'Activity & Products', subtitle: 'Sector, products, processes' },
  { label: 'Markets & Compliance', subtitle: 'Export scope & certifications' },
  { label: 'Quality Team', subtitle: 'Maturity & contacts' },
];

function createEmptyIdentity(): CompanyIdentityData {
  return {
    legalName: '',
    tradeName: '',
    country: '',
    address: '',
    registrationNumber: '',
    yearFounded: '',
    website: '',
    logoFile: null,
    logoPreview: '',
  };
}

function createEmptyActivity(): ActivityProductsData {
  return {
    primarySector: '',
    subSectors: [],
    products: [],
    productionProcesses: [],
    rawMaterials: [],
    assetTypes: [],
  };
}

function createEmptyMarkets(): MarketsComplianceData {
  return {
    sites: [{ siteName: '', country: '', city: '', role: '' }],
    targetMarkets: [],
    certifications: [],
    targetCertifications: [],
    industryLabels: [],
  };
}

function createEmptyQuality(): QualityTeamData {
  return {
    maturityLevel: '',
    employeeRange: '',
    revenueRange: '',
    qualityTeamSize: '',
    qualityManagerName: '',
    qualityManagerEmail: '',
    qualityChallenges: [],
    hasDocuments: false,
  };
}

/** Map API response entity fields → local step data shapes. */
function mapProfileToState(profile: any) {
  const identity: CompanyIdentityData = {
    legalName: profile.legalName ?? '',
    tradeName: profile.tradeName ?? '',
    country: profile.headquartersCountry ?? '',
    address: profile.headquartersAddress ?? '',
    registrationNumber: profile.registrationNumber ?? '',
    yearFounded: profile.yearFounded?.toString() ?? '',
    website: profile.website ?? '',
    logoFile: null,
    logoPreview: '',
  };

  const activity: ActivityProductsData = {
    primarySector: profile.primarySector ?? '',
    subSectors: profile.subSectors ?? [],
    products: profile.products ?? [],
    productionProcesses: profile.productionProcesses ?? [],
    rawMaterials: profile.rawMaterials ?? [],
    assetTypes: profile.assetTypes ?? [],
  };

  const sites = profile.sites ?? [];
  const markets: MarketsComplianceData = {
    sites: sites.length > 0 ? sites : [{ siteName: '', country: '', city: '', role: '' }],
    targetMarkets: profile.targetMarkets ?? [],
    certifications: profile.certifications ?? [],
    targetCertifications: profile.targetCertifications ?? [],
    industryLabels: profile.industryLabels ?? [],
  };

  const quality: QualityTeamData = {
    maturityLevel: profile.maturityLevel ?? '',
    employeeRange: profile.employeeRange ?? '',
    revenueRange: profile.revenueRange ?? '',
    qualityTeamSize: profile.qualityTeamSize?.toString() ?? '',
    qualityManagerName: profile.qualityManagerName ?? '',
    qualityManagerEmail: profile.qualityManagerEmail ?? '',
    qualityChallenges: profile.qualityChallenges ?? [],
    hasDocuments: profile.hasDocuments ?? false,
  };

  return { identity, activity, markets, quality };
}

/** Map local step data → API payload fields. */
function buildPayload(identity: CompanyIdentityData, activity: ActivityProductsData, markets: MarketsComplianceData, quality: QualityTeamData) {
  return {
    identity: {
      legalName: identity.legalName || undefined,
      tradeName: identity.tradeName || undefined,
      headquartersCountry: identity.country || undefined,
      headquartersAddress: identity.address || undefined,
      registrationNumber: identity.registrationNumber || undefined,
      yearFounded: identity.yearFounded ? parseInt(identity.yearFounded, 10) : undefined,
      website: identity.website || undefined,
    },
    activity: {
      primarySector: activity.primarySector || undefined,
      subSectors: activity.subSectors.length > 0 ? activity.subSectors : undefined,
      products: activity.products.length > 0 ? activity.products : undefined,
      productionProcesses: activity.productionProcesses.length > 0 ? activity.productionProcesses : undefined,
      rawMaterials: activity.rawMaterials.length > 0 ? activity.rawMaterials : undefined,
      assetTypes: activity.assetTypes.length > 0 ? activity.assetTypes : undefined,
    },
    markets: {
      sites: markets.sites.filter((s) => s.siteName.trim()),
      targetMarkets: markets.targetMarkets.length > 0 ? markets.targetMarkets : undefined,
      certifications: markets.certifications.length > 0 ? markets.certifications : undefined,
      targetCertifications: markets.targetCertifications.length > 0 ? markets.targetCertifications : undefined,
      industryLabels: markets.industryLabels.length > 0 ? markets.industryLabels : undefined,
    },
    quality: {
      maturityLevel: quality.maturityLevel || undefined,
      employeeRange: quality.employeeRange || undefined,
      revenueRange: quality.revenueRange || undefined,
      qualityTeamSize: quality.qualityTeamSize ? parseInt(quality.qualityTeamSize, 10) : undefined,
      qualityManagerName: quality.qualityManagerName || undefined,
      qualityManagerEmail: quality.qualityManagerEmail || undefined,
      qualityChallenges: quality.qualityChallenges.length > 0 ? quality.qualityChallenges : undefined,
      hasDocuments: quality.hasDocuments || undefined,
    },
  };
}

export default function CompanyPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [identity, setIdentity] = useState<CompanyIdentityData>(createEmptyIdentity());
  const [activity, setActivity] = useState<ActivityProductsData>(createEmptyActivity());
  const [markets, setMarkets] = useState<MarketsComplianceData>(createEmptyMarkets());
  const [quality, setQuality] = useState<QualityTeamData>(createEmptyQuality());

  // Load existing profile on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await companyProfileApi.getProfile();
        if (cancelled) return;
        const profile = res.data;
        if (profile) {
          const mapped = mapProfileToState(profile);
          setIdentity(mapped.identity);
          setActivity(mapped.activity);
          setMarkets(mapped.markets);
          setQuality(mapped.quality);
          if (profile.currentStep) setCurrentStep(profile.currentStep);
          if (profile.onboardingStatus === 'COMPLETED') {
            setIsCompleted(true);
          }
          // Mark completed steps based on data presence
          const completed: number[] = [];
          if (profile.legalName) completed.push(0);
          if (profile.primarySector) completed.push(1);
          if (profile.sites?.length > 0) completed.push(2);
          if (profile.maturityLevel) completed.push(3);
          setCompletedSteps(completed);
        }
      } catch {
        // Profile doesn't exist yet — that's fine
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const validateStep = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 0:
          if (!identity.legalName.trim()) {
            toast.error('Legal company name is required');
            return false;
          }
          if (!identity.country) {
            toast.error('Country of headquarters is required');
            return false;
          }
          return true;
        case 1:
          if (!activity.primarySector) {
            toast.error('Primary industry sector is required');
            return false;
          }
          if (activity.subSectors.length === 0) {
            toast.error('At least one sub-sector is required');
            return false;
          }
          if (activity.products.length === 0) {
            toast.error('At least one product is required');
            return false;
          }
          if (activity.productionProcesses.length === 0) {
            toast.error('Select at least one production process');
            return false;
          }
          return true;
        case 2:
          if (markets.sites.some((s) => !s.siteName.trim() || !s.country || !s.role)) {
            toast.error('Complete all required site fields');
            return false;
          }
          if (markets.targetMarkets.length === 0) {
            toast.error('Select at least one target market');
            return false;
          }
          if (markets.targetCertifications.length === 0) {
            toast.error('Add at least one target certification');
            return false;
          }
          return true;
        case 3:
          if (!quality.maturityLevel) {
            toast.error('Select your quality maturity level');
            return false;
          }
          if (!quality.employeeRange) {
            toast.error('Number of employees is required');
            return false;
          }
          if (!quality.qualityManagerName.trim()) {
            toast.error('Quality manager name is required');
            return false;
          }
          if (!quality.qualityManagerEmail.trim()) {
            toast.error('Quality manager email is required');
            return false;
          }
          return true;
        default:
          return true;
      }
    },
    [identity, activity, markets, quality]
  );

  const saveStepToApi = async (nextStep: number) => {
    const payload = buildPayload(identity, activity, markets, quality);
    await companyProfileApi.saveProfile({
      ...payload,
      currentStep: nextStep,
      onboardingStatus: 'IN_PROGRESS',
    });
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;
    setIsSaving(true);
    try {
      const nextStep = Math.min(currentStep + 1, STEPS.length - 1);
      await saveStepToApi(nextStep);
      setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error('Failed to save progress');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAndExit = async () => {
    setIsSaving(true);
    try {
      const payload = buildPayload(identity, activity, markets, quality);
      await companyProfileApi.saveProfile({
        ...payload,
        currentStep,
        onboardingStatus: 'IN_PROGRESS',
      });
      toast.success('Progress saved successfully');
    } catch {
      toast.error('Failed to save progress');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!validateStep(currentStep)) return;
    setIsSaving(true);
    try {
      const payload = buildPayload(identity, activity, markets, quality);
      await companyProfileApi.saveProfile({
        ...payload,
        currentStep: STEPS.length - 1,
        onboardingStatus: 'COMPLETED',
      });
      await companyProfileApi.complete();
      toast.success('Company profile completed!');
      setIsCompleted(true);
      setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    } catch {
      toast.error('Failed to submit profile');
    } finally {
      setIsSaving(false);
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  const handleSaveProfile = async (updatedIdentity: CompanyIdentityData) => {
    setIsSaving(true);
    try {
      const payload = buildPayload(updatedIdentity, activity, markets, quality);
      await companyProfileApi.saveProfile({
        ...payload,
        currentStep: STEPS.length - 1,
        onboardingStatus: 'COMPLETED',
      });
      setIdentity(updatedIdentity);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuality = async (
    updatedActivity: ActivityProductsData,
    updatedMarkets: MarketsComplianceData,
    updatedQuality: QualityTeamData,
  ) => {
    setIsSaving(true);
    try {
      const payload = buildPayload(identity, updatedActivity, updatedMarkets, updatedQuality);
      await companyProfileApi.saveProfile({
        ...payload,
        currentStep: STEPS.length - 1,
        onboardingStatus: 'COMPLETED',
      });
      setActivity(updatedActivity);
      setMarkets(updatedMarkets);
      setQuality(updatedQuality);
      toast.success('Quality info updated successfully');
    } catch {
      toast.error('Failed to update quality info');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepIdentity data={identity} onChange={(d) => setIdentity((p) => ({ ...p, ...d }))} />;
      case 1:
        return <StepActivity data={activity} onChange={(d) => setActivity((p) => ({ ...p, ...d }))} />;
      case 2:
        return <StepMarkets data={markets} onChange={(d) => setMarkets((p) => ({ ...p, ...d }))} />;
      case 3:
        return <StepQuality data={quality} onChange={(d) => setQuality((p) => ({ ...p, ...d }))} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout pageTitle="My company" pageTagline="">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-[var(--muted)]">Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Completed profile view
  if (isCompleted) {
    return (
      <DashboardLayout pageTitle="My company" pageTagline="">
        <div className="w-full">
          <CompanyProfileView
            identity={identity}
            activity={activity}
            markets={markets}
            quality={quality}
            isEditing={isEditing}
            onEdit={() => setIsEditing(true)}
            onSave={handleSaveProfile}
            onSaveQuality={handleSaveQuality}
            onCancel={() => setIsEditing(false)}
            isSaving={isSaving}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="My company" pageTagline="">
      <div className="mx-auto max-w-4xl">
        {/* Stepper header */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-6 shadow-sm">
          <Stepper steps={STEPS} currentStep={currentStep} completedSteps={completedSteps} />
        </div>

        {/* Step content */}
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-8 py-8 shadow-sm">
          {renderStep()}
        </div>

        {/* Footer bar */}
        <div className="sticky bottom-0 z-10 mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            {/* Left: auto-save indicator */}
            <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
              <Check className="h-4 w-4 text-emerald-500" />
              Progress saved automatically
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndExit}
                disabled={isSaving}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Save &amp; exit
              </Button>

              {isLastStep ? (
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSaving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Completing...
                    </>
                  ) : (
                    <>
                      Complete profile
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSaving}
                  className="gap-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
