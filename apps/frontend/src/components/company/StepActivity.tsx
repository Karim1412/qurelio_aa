'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TagInput } from '@/components/company/TagInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info } from '@/components/icons';

const INDUSTRY_SECTORS = [
  'Textile & Apparel', 'Food & Beverage', 'Chemical & Pharmaceutical',
  'Automotive', 'Electronics & Electrical', 'Metal & Metallurgy',
  'Construction & Building Materials', 'Plastics & Rubber',
  'Paper & Packaging', 'Aerospace & Defense', 'Oil & Gas',
  'Agriculture & Agri-food', 'Mining & Quarrying', 'Energy & Utilities',
  'Healthcare & Medical Devices', 'Furniture & Wood', 'Printing & Publishing',
  'Sports & Leisure', 'Shipbuilding & Marine', 'Other',
];

const PRODUCTION_PROCESSES = [
  'Production / Assembly', 'Quality Control', 'Procurement',
  'Dyeing & Finishing', 'Cold Chain', 'Chemical Synthesis',
  'Sterilization', 'Logistics / Warehousing', 'R&D',
  'Packaging', 'Surface Treatment', 'Machining',
];

const ASSET_TYPES = [
  'Production machinery', 'Measuring instruments', 'Lifting equipment',
  'Pressure vessels', 'Electrical installations', 'Vehicles',
  'IT infrastructure', 'Medical equipment',
];

export interface ActivityProductsData {
  primarySector: string;
  subSectors: string[];
  products: string[];
  productionProcesses: string[];
  rawMaterials: string[];
  assetTypes: string[];
}

interface StepActivityProps {
  data: ActivityProductsData;
  onChange: (data: Partial<ActivityProductsData>) => void;
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const isChecked = selected.includes(option);
        return (
          <label
            key={option}
            className={`
              inline-flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200
              ${
                isChecked
                  ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]'
                  : 'border-[var(--input-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/25 hover:bg-[var(--nav-hover)]/50'
              }
            `}
          >
            <Checkbox checked={isChecked} onCheckedChange={() => toggle(option)} />
            {option}
          </label>
        );
      })}
    </div>
  );
}

export function StepActivity({ data, onChange }: StepActivityProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Activity &amp; Products
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Describe what your company makes and how — the AI uses this as its primary context filter.
        </p>
      </div>

      {/* Info callout */}
      <div className="callout-info flex items-start gap-3 rounded-xl border border-[var(--callout-info-border)] bg-[var(--callout-info-bg)] p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-primary)]" />
        <p className="text-[13px] leading-relaxed text-[var(--callout-info-text)]">
          <strong>Why this matters:</strong> the more specific you are here, the more accurate your
          compliance evaluations will be. &ldquo;Stainless steel food-contact valves&rdquo; is far
          more useful to the AI than &ldquo;industrial parts&rdquo;.
        </p>
      </div>

      <div className="space-y-6">
        {/* Primary sector */}
        <div className="space-y-1.5">
          <Label>
            Primary industry sector <span className="text-red-500">*</span>
          </Label>
          <Select value={data.primarySector} onValueChange={(v) => onChange({ primarySector: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_SECTORS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sub-sectors */}
        <div className="space-y-1.5">
          <Label>
            Sub-sector / Specific activity <span className="text-red-500">*</span>
          </Label>
          <TagInput
            tags={data.subSectors}
            onChange={(subSectors) => onChange({ subSectors })}
            placeholder='Type and press Enter... e.g. "Denim manufacturing", "Contract finishing"'
          />
          <p className="text-[11px] text-[var(--muted)]">
            Be specific. E.g. &ldquo;Denim manufacturing&rdquo;, &ldquo;Contract finishing&rdquo;,
            &ldquo;Technical textiles&rdquo;
          </p>
        </div>

        {/* Products */}
        <div className="space-y-1.5">
          <Label>
            Products manufactured / sold <span className="text-red-500">*</span>
          </Label>
          <TagInput
            tags={data.products}
            onChange={(products) => onChange({ products })}
            placeholder="Add a product and press Enter..."
          />
          <p className="text-[11px] text-[var(--muted)]">
            List specific products — the AI matches these against the regulation landscape to detect
            missing standards.
          </p>
        </div>

        {/* Key Production Processes */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Key Production Processes <span className="text-red-500">*</span>
          </p>
          <CheckboxGroup
            options={PRODUCTION_PROCESSES}
            selected={data.productionProcesses}
            onChange={(productionProcesses) => onChange({ productionProcesses })}
          />
        </div>

        {/* Raw Materials */}
        <div className="space-y-1.5">
          <Label>Raw Materials &amp; Key Inputs</Label>
          <TagInput
            tags={data.rawMaterials}
            onChange={(rawMaterials) => onChange({ rawMaterials })}
            placeholder="Add a material and press Enter..."
          />
          <p className="text-[11px] text-[var(--muted)]">
            Optional — helps the AI flag relevant chemical/material regulations (REACH, OEKO-TEX, etc.).
          </p>
        </div>

        {/* Asset Types */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Asset Types
          </p>
          <CheckboxGroup
            options={ASSET_TYPES}
            selected={data.assetTypes}
            onChange={(assetTypes) => onChange({ assetTypes })}
          />
        </div>
      </div>
    </div>
  );
}
