'use client';

import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Camera } from '@/components/icons';
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
  'Japan', 'South Korea', 'Singapore', 'Australia', 'South Africa', 'Nigeria',
];

export interface CompanyIdentityData {
  legalName: string;
  tradeName: string;
  country: string;
  address: string;
  registrationNumber: string;
  yearFounded: string;
  website: string;
  logoFile: File | null;
  logoPreview: string;
}

interface StepIdentityProps {
  data: CompanyIdentityData;
  onChange: (data: Partial<CompanyIdentityData>) => void;
}

export function StepIdentity({ data, onChange }: StepIdentityProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2 MB');
        return;
      }
      const preview = URL.createObjectURL(file);
      onChange({ logoFile: file, logoPreview: preview });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Company Identity
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Legal and administrative information about your organisation.
        </p>
      </div>

      <div className="space-y-5">
        {/* Row 1: Legal name + Trade name */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              Legal company name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={data.legalName}
              onChange={(e) => onChange({ legalName: e.target.value })}
              placeholder="e.g. Textile Industrie Maghreb S.A."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Trade name / Brand</Label>
            <Input
              value={data.tradeName}
              onChange={(e) => onChange({ tradeName: e.target.value })}
              placeholder="e.g. TIM Group"
            />
          </div>
        </div>

        {/* Row 2: Country + Address */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              Country of headquarters <span className="text-red-500">*</span>
            </Label>
            <Select value={data.country} onValueChange={(v) => onChange({ country: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a country" />
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
            <Label>Headquarters address</Label>
            <Input
              value={data.address}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="e.g. Zone Industrielle Monastir, Monastir 5000"
            />
          </div>
        </div>

        {/* Row 3: Registration + Year */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Registration / Tax number</Label>
            <Input
              value={data.registrationNumber}
              onChange={(e) => onChange({ registrationNumber: e.target.value })}
              placeholder="e.g. 1234567/A/M/000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Year founded</Label>
            <Input
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              value={data.yearFounded}
              onChange={(e) => onChange({ yearFounded: e.target.value })}
              placeholder="e.g. 2004"
            />
          </div>
        </div>

        {/* Row 4: Website */}
        <div className="space-y-1.5">
          <Label>Company website</Label>
          <Input
            type="url"
            value={data.website}
            onChange={(e) => onChange({ website: e.target.value })}
            placeholder="https://www.example.com"
          />
        </div>

        {/* Logo upload */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Company Logo
          </p>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-dashed',
                data.logoPreview
                  ? 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5'
                  : 'border-[var(--input-border)] bg-[var(--surface-muted)]'
              )}
            >
              {data.logoPreview ? (
                <img
                  src={data.logoPreview}
                  alt="Logo preview"
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <Camera className="h-6 w-6 text-[var(--muted)]" />
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg"
                onChange={handleLogoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Upload logo
              </Button>
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                PNG, JPG or SVG · Max 2 MB · Will be resized to 256×256
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
