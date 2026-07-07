'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info } from '@/components/icons';
import { cn } from '@/utils/cn';

// ── Soft illustrated SVG icons for maturity levels ────────────────────────

function NoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 38V24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 24c0-4 4-8 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M24 28c0-4-4-7-7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="39" rx="6" ry="2" fill="currentColor" opacity="0.12" />
      <circle cx="24" cy="18" r="2.5" fill="currentColor" opacity="0.2" />
      <path d="M21.5 18c-1-2 0-5 2-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M26.5 18c1-2 0-5-2-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function InformalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="12" y="8" width="24" height="32" rx="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" opacity="0.06" />
      <path d="M18 16h12M18 22h10M18 28h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <path d="M18 34h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.3" />
      <rect x="10" y="6" width="8" height="4" rx="1" fill="currentColor" opacity="0.15" />
      <circle cx="34" cy="34" r="6" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.4" />
      <path d="M32 34h4M34 32v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function DevelopingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.8" fill="currentColor" opacity="0.06" />
      <path d="M18 30l4-4 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.4" fill="currentColor" opacity="0.15" />
      <path d="M17 16v-4M15 18h-4M19 18h4M15.5 16l-2.5-2.5M18.5 16l2.5-2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function EstablishedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M10 38h28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="14" y="18" width="20" height="20" rx="1" stroke="currentColor" strokeWidth="1.8" fill="currentColor" opacity="0.06" />
      <path d="M14 18l10-8 10 8" stroke="currentColor" strokeWidth="1.8" fill="currentColor" opacity="0.12" strokeLinejoin="round" />
      <rect x="21" y="28" width="6" height="10" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <rect x="17" y="22" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity="0.15" />
      <rect x="27" y="22" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity="0.15" />
      <path d="M20 14l4-3 4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CertifiedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="20" r="12" stroke="currentColor" strokeWidth="1.8" fill="currentColor" opacity="0.06" />
      <circle cx="24" cy="20" r="8" stroke="currentColor" strokeWidth="1.4" fill="currentColor" opacity="0.1" />
      <path d="M21 20l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 32l-2 8 8-4 8 4-2-8" stroke="currentColor" strokeWidth="1.6" fill="currentColor" opacity="0.12" strokeLinejoin="round" />
      <path d="M20 32l2 6 2-3 2 3 2-6" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

const MATURITY_LEVELS = [
  {
    value: 'none',
    label: 'None',
    description: 'Starting from scratch — no QMS or documentation in place',
    Icon: NoneIcon,
    color: 'slate',
  },
  {
    value: 'informal',
    label: 'Informal',
    description: 'Practices exist but are undocumented or inconsistent',
    Icon: InformalIcon,
    color: 'amber',
  },
  {
    value: 'developing',
    label: 'Developing',
    description: 'Some written procedures, no formal QMS yet',
    Icon: DevelopingIcon,
    color: 'blue',
  },
  {
    value: 'established',
    label: 'Established',
    description: 'Full QMS in place and operational — not yet certified',
    Icon: EstablishedIcon,
    color: 'violet',
  },
  {
    value: 'certified',
    label: 'Certified',
    description: 'Active certification in force (ISO 9001 or similar)',
    Icon: CertifiedIcon,
    color: 'emerald',
  },
];

const MATURITY_COLORS: Record<string, { sel: string; hover: string; icon: string }> = {
  slate:   { sel: 'border-slate-400 bg-slate-50 shadow-[0_0_0_3px_rgba(148,163,184,0.15)]', hover: 'hover:border-slate-300/50', icon: 'text-slate-600' },
  amber:   { sel: 'border-amber-400 bg-amber-50 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]', hover: 'hover:border-amber-300/50', icon: 'text-amber-600' },
  blue:    { sel: 'border-blue-400 bg-blue-50 shadow-[0_0_0_3px_rgba(96,165,250,0.15)]', hover: 'hover:border-blue-300/50', icon: 'text-blue-600' },
  violet:  { sel: 'border-violet-400 bg-violet-50 shadow-[0_0_0_3px_rgba(167,139,250,0.15)]', hover: 'hover:border-violet-300/50', icon: 'text-violet-600' },
  emerald: { sel: 'border-emerald-400 bg-emerald-50 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]', hover: 'hover:border-emerald-300/50', icon: 'text-emerald-600' },
};

const EMPLOYEE_RANGES = [
  '1–10', '11–25', '26–50', '51–250', '251–500', '501–1000', '1000+',
];

const REVENUE_RANGES = [
  'Under €1M', '€1M – €5M', '€5M – €10M', '€10M – €50M',
  '€50M – €100M', '€100M – €500M', 'Over €500M',
];

const QUALITY_CHALLENGES = [
  'Supplier control', 'Customer complaints', 'Document management',
  'Regulatory compliance', 'Production nonconformances', 'Employee training',
  'Audit preparation', 'Risk management',
];

export interface QualityTeamData {
  maturityLevel: string;
  employeeRange: string;
  revenueRange: string;
  qualityTeamSize: string;
  qualityManagerName: string;
  qualityManagerEmail: string;
  qualityChallenges: string[];
  hasDocuments: boolean;
}

interface StepQualityProps {
  data: QualityTeamData;
  onChange: (data: Partial<QualityTeamData>) => void;
}

export function StepQuality({ data, onChange }: StepQualityProps) {
  const toggleChallenge = (challenge: string) => {
    const challenges = data.qualityChallenges.includes(challenge)
      ? data.qualityChallenges.filter((c) => c !== challenge)
      : [...data.qualityChallenges, challenge];
    onChange({ qualityChallenges: challenges });
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Quality Team &amp; Context
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Tell us about your team and your current quality maturity — the AI calibrates its output to
          your level.
        </p>
      </div>

      {/* Quality System Maturity */}
      <div className="space-y-4">
        <Label>
          Quality System Maturity <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {MATURITY_LEVELS.map((level) => {
            const isSelected = data.maturityLevel === level.value;
            const palette = MATURITY_COLORS[level.color];
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => onChange({ maturityLevel: level.value })}
                className={cn(
                  'group flex flex-col items-center gap-3 rounded-2xl border-2 p-4 text-center transition-all duration-200',
                  isSelected
                    ? cn(palette.sel, 'bg-[var(--surface)]')
                    : cn('border-[var(--input-border)] bg-[var(--surface)]', palette.hover, 'hover:bg-[var(--nav-hover)]/50')
                )}
              >
                <span className={cn('h-12 w-12 shrink-0', isSelected ? palette.icon : 'text-[var(--muted)] transition-colors group-hover:' + palette.icon)}>
                  <level.Icon className="h-full w-full" />
                </span>
                <span
                  className={cn(
                    'text-sm font-bold',
                    isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'
                  )}
                >
                  {level.label}
                </span>
                <span className="text-[11px] leading-snug text-[var(--muted)]">
                  {level.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Organisational Scale */}
      <div className="space-y-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Organisational Scale <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>
              Number of employees <span className="text-red-500">*</span>
            </Label>
            <Select value={data.employeeRange} onValueChange={(v) => onChange({ employeeRange: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_RANGES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Annual revenue range</Label>
            <Select value={data.revenueRange} onValueChange={(v) => onChange({ revenueRange: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_RANGES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quality team size</Label>
            <Input
              type="number"
              min={0}
              value={data.qualityTeamSize}
              onChange={(e) => onChange({ qualityTeamSize: e.target.value })}
              placeholder="e.g. 4"
            />
          </div>
        </div>
      </div>

      {/* Quality Manager */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Quality Manager <span className="text-red-500">*</span>
          </p>
          <div className="callout-info flex items-start gap-3 rounded-xl border border-[var(--callout-info-border)] bg-[var(--callout-info-bg)] p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-primary)]" />
            <p className="text-[13px] leading-relaxed text-[var(--callout-info-text)]">
              The Quality Manager is pre-filled as the default reviewer for all AI-generated outputs
              (quarantine inbox), CAPA assignments, and audit programs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              Full name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={data.qualityManagerName}
              onChange={(e) => onChange({ qualityManagerName: e.target.value })}
              placeholder="e.g. Sonia Ben Amor"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              value={data.qualityManagerEmail}
              onChange={(e) => onChange({ qualityManagerEmail: e.target.value })}
              placeholder="e.g. s.benamor@example.com"
            />
          </div>
        </div>
      </div>

      {/* Quality Challenges */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Main Quality Challenges
        </p>
        <div className="flex flex-wrap gap-2.5">
          {QUALITY_CHALLENGES.map((challenge) => {
            const isChecked = data.qualityChallenges.includes(challenge);
            return (
              <label
                key={challenge}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  isChecked
                    ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]'
                    : 'border-[var(--input-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/25 hover:bg-[var(--nav-hover)]/50'
                )}
              >
                <Checkbox checked={isChecked} onCheckedChange={() => toggleChallenge(challenge)} />
                {challenge}
              </label>
            );
          })}
        </div>
      </div>

      {/* Existing Documentation */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Existing Documentation
        </p>
        <label
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200',
            data.hasDocuments
              ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]'
              : 'border-[var(--input-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/25'
          )}
        >
          <Checkbox
            checked={data.hasDocuments}
            onCheckedChange={(checked) => onChange({ hasDocuments: checked === true })}
          />
          We have existing quality documents to upload (procedures, records, reports...)
        </label>

        {data.hasDocuments && (
          <div className="callout-info flex items-start gap-3 rounded-xl border border-[var(--callout-info-border)] bg-[var(--callout-info-bg)] p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-primary)]" />
            <p className="text-[13px] leading-relaxed text-[var(--callout-info-text)]">
              After saving this step, you&apos;ll be prompted to upload your product folder — those
              documents build your{' '}
              <span className="font-semibold text-[var(--brand-primary)]">Compliance Memory</span>{' '}
              and unlock AI-powered compliance evaluation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
