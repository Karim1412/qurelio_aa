'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TagInput } from '@/components/company/TagInput';
import { Plus } from '@/components/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';

const COUNTRIES = [
  'Tunisia', 'Morocco', 'Algeria', 'Egypt', 'France', 'Germany', 'Italy',
  'Spain', 'United Kingdom', 'Netherlands', 'Belgium', 'Turkey', 'Saudi Arabia',
  'UAE', 'Qatar', 'Kuwait', 'China', 'India', 'USA', 'Canada', 'Brazil',
];

const SITE_ROLES = ['Production', 'Warehouse', 'R&D Lab', 'Office', 'Distribution Center', 'Other'];

const EXPORT_MARKETS = [
  'European Union', 'USA (FDA-regulated)', 'USA (General)',
  'Gulf (GCC / GSO)', 'North Africa / Maghreb', 'Sub-Saharan Africa',
  'United Kingdom', 'Canada', 'China', 'Domestic — Tunisia',
];

const INDUSTRY_LABELS = [
  'CE Marking', 'FDA Registration', 'Halal', 'Kosher',
  'Organic', 'Fair Trade', 'Ecolabel',
];

export interface SiteEntry {
  siteName: string;
  country: string;
  city: string;
  role: string;
}

export interface CertificationEntry {
  standardName: string;
  certifyingBody: string;
  issueDate: string;
  expiryDate: string;
  scopeNote: string;
}

export interface MarketsComplianceData {
  sites: SiteEntry[];
  targetMarkets: string[];
  certifications: CertificationEntry[];
  targetCertifications: string[];
  industryLabels: string[];
}

interface StepMarketsProps {
  data: MarketsComplianceData;
  onChange: (data: Partial<MarketsComplianceData>) => void;
}

function createEmptySite(): SiteEntry {
  return { siteName: '', country: '', city: '', role: '' };
}

function createEmptyCert(): CertificationEntry {
  return { standardName: '', certifyingBody: '', issueDate: '', expiryDate: '', scopeNote: '' };
}

export function StepMarkets({ data, onChange }: StepMarketsProps) {
  const updateSite = (index: number, field: keyof SiteEntry, value: string) => {
    const updated = [...data.sites];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ sites: updated });
  };

  const addSite = () => {
    onChange({ sites: [...data.sites, createEmptySite()] });
  };

  const removeSite = (index: number) => {
    if (data.sites.length <= 1) return;
    onChange({ sites: data.sites.filter((_, i) => i !== index) });
  };

  const updateCert = (index: number, field: keyof CertificationEntry, value: string) => {
    const updated = [...data.certifications];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ certifications: updated });
  };

  const addCert = () => {
    onChange({ certifications: [...data.certifications, createEmptyCert()] });
  };

  const removeCert = (index: number) => {
    onChange({ certifications: data.certifications.filter((_, i) => i !== index) });
  };

  const toggleMarket = (market: string) => {
    const markets = data.targetMarkets.includes(market)
      ? data.targetMarkets.filter((m) => m !== market)
      : [...data.targetMarkets, market];
    onChange({ targetMarkets: markets });
  };

  const toggleLabel = (label: string) => {
    const labels = data.industryLabels.includes(label)
      ? data.industryLabels.filter((l) => l !== label)
      : [...data.industryLabels, label];
    onChange({ industryLabels: labels });
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Markets &amp; Compliance Landscape
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Where you sell determines which regulations apply. Your certifications set the baseline for
          AI evaluation.
        </p>
      </div>

      {/* Geographic Footprint */}
      <div className="space-y-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Geographic Footprint
        </p>

        {/* Sites */}
        <div className="space-y-1.5">
          <Label>
            Production / Operation sites <span className="text-red-500">*</span>
          </Label>
          <p className="text-[11px] text-[var(--muted)]">
            Add at least one site. Multi-site companies can scope compliance evaluations per site.
          </p>
        </div>

        <div className="space-y-4">
          {data.sites.map((site, index) => (
            <div
              key={index}
              className="relative rounded-2xl border border-[var(--input-border)] bg-[var(--surface)] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Site {index + 1}
                </span>
                {data.sites.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSite(index)}
                    className="text-[var(--muted)] transition-hover hover:text-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>
                    Site name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={site.siteName}
                    onChange={(e) => updateSite(index, 'siteName', e.target.value)}
                    placeholder="e.g. Monastir Plant"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <Select value={site.country} onValueChange={(v) => updateSite(index, 'country', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    value={site.city}
                    onChange={(e) => updateSite(index, 'city', e.target.value)}
                    placeholder="e.g. Monastir"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Role <span className="text-red-500">*</span>
                  </Label>
                  <Select value={site.role} onValueChange={(v) => updateSite(index, 'role', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {SITE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addSite}
            className="w-full gap-2 border-dashed"
          >
            <Plus className="h-4 w-4" />
            Add another site
          </Button>
        </div>

        {/* Target export markets */}
        <div className="space-y-2.5">
          <Label>
            Target export markets <span className="text-red-500">*</span>
          </Label>
          <p className="text-[11px] text-[var(--muted)]">
            Select all markets you currently sell to or are actively targeting.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {EXPORT_MARKETS.map((market) => {
              const isChecked = data.targetMarkets.includes(market);
              return (
                <label
                  key={market}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200',
                    isChecked
                      ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]'
                      : 'border-[var(--input-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/25 hover:bg-[var(--nav-hover)]/50'
                  )}
                >
                  <Checkbox checked={isChecked} onCheckedChange={() => toggleMarket(market)} />
                  {market}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compliance Landscape */}
      <div className="space-y-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Compliance Landscape
        </p>

        {/* Certifications */}
        <div className="space-y-1.5">
          <Label>Current active certifications</Label>
          <p className="text-[11px] text-[var(--muted)]">
            Add your existing certifications. Expiry dates trigger automatic reminders.
          </p>
        </div>

        <div className="space-y-4">
          {data.certifications.map((cert, index) => (
            <div
              key={index}
              className="relative rounded-2xl border border-[var(--input-border)] bg-[var(--surface)] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Certification {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCert(index)}
                  className="text-[var(--muted)] transition-hover hover:text-red-500"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Standard name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={cert.standardName}
                    onChange={(e) => updateCert(index, 'standardName', e.target.value)}
                    placeholder="e.g. ISO 9001:2015"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Certifying body</Label>
                  <Input
                    value={cert.certifyingBody}
                    onChange={(e) => updateCert(index, 'certifyingBody', e.target.value)}
                    placeholder="e.g. Bureau Veritas"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Issue date</Label>
                  <Input
                    type="date"
                    value={cert.issueDate}
                    onChange={(e) => updateCert(index, 'issueDate', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expiry date</Label>
                  <Input
                    type="date"
                    value={cert.expiryDate}
                    onChange={(e) => updateCert(index, 'expiryDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <Label>Scope note</Label>
                <Input
                  value={cert.scopeNote}
                  onChange={(e) => updateCert(index, 'scopeNote', e.target.value)}
                  placeholder="Optional — e.g. 'Manufacturing of denim fabrics, Monastir plant only'"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addCert}
            className="w-full gap-2 border-dashed"
          >
            <Plus className="h-4 w-4" />
            Add a certification
          </Button>
        </div>

        {/* Target certifications */}
        <div className="space-y-1.5">
          <Label>
            Target certifications / standards <span className="text-red-500">*</span>
          </Label>
          <TagInput
            tags={data.targetCertifications}
            onChange={(targetCertifications) => onChange({ targetCertifications })}
            placeholder="Add a target standard and press Enter..."
          />
          <p className="text-[11px] text-[var(--muted)]">
            The monitoring engine watches all regulatory families related to these standards.
          </p>
        </div>

        {/* Industry labels */}
        <div className="space-y-2.5">
          <Label>Industry-specific labels / marks</Label>
          <div className="flex flex-wrap gap-2.5">
            {INDUSTRY_LABELS.map((label) => {
              const isChecked = data.industryLabels.includes(label);
              return (
                <label
                  key={label}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200',
                    isChecked
                      ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]'
                      : 'border-[var(--input-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/25 hover:bg-[var(--nav-hover)]/50'
                  )}
                >
                  <Checkbox checked={isChecked} onCheckedChange={() => toggleLabel(label)} />
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
