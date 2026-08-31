'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QurelioPhoneInput } from '@/components/ui/phone-input';
import { ArrowLeft, ArrowRight, Calendar, Check, Loader2 } from '@/components/icons';
import { demoApi, type DemoSlotPublic } from '@/lib/api';
import {
  EA_CERTIFICATIONS, EA_CHALLENGES, EA_COMPANY_SIZES, EA_COMPLIANCE_TODAY,
  EA_CONSULTING_SCOPES, EA_CONTACT_EMAIL, EA_DECISION_ROLES, EA_INDUSTRIES,
  EA_LANGUAGES, EA_LEGAL_ENTITY, EA_MARKETS, EA_MAX_CHALLENGES,
  EA_PERSONAL_EMAIL_DOMAINS, EA_PILOT_ANSWERS, EA_PRODUCT_COUNTS,
  EA_RESPONSE_HOURS, EA_ROLES, EA_TIMELINES,
} from '@/components/demo/demo-form-options';
import { cn } from '@/utils/cn';
import { useI18n } from '@/i18n';

export function formatSlot(iso: string, locale?: string): string {
  return new Date(iso).toLocaleString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}

interface FormState {
  fullName: string;
  email: string;
  companyName: string;
  role: string;
  roleOther: string;
  phone: string;
  field: string;
  consultingScope: string;
  companyCapacity: string;
  marketsActive: string[];
  marketsTargeting: string[];
  certifications: string[];
  certificationsOther: string;
  productCount: string;
  complianceToday: string;
  qmsName: string;
  challenges: string[];
  challengesOther: string;
  timeline: string;
  decisionRole: string;
  pilotInterest: string;
  description: string;
  preferredLanguage: string;
  consentContact: boolean;
  consentMarketing: boolean;
}

const EMPTY: FormState = {
  fullName: '', email: '', companyName: '', role: '', roleOther: '', phone: '',
  field: '', consultingScope: '', companyCapacity: '',
  marketsActive: [], marketsTargeting: [], certifications: [], certificationsOther: '',
  productCount: '', complianceToday: '', qmsName: '', challenges: [], challengesOther: '',
  timeline: '', decisionRole: '', pilotInterest: '', description: '', preferredLanguage: '',
  consentContact: false, consentMarketing: false,
};

function Question({
  n, label, required, help, children,
}: { n: number; label: string; required?: boolean; help?: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <Label className="mb-0 flex items-start gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
        <span className="text-[var(--brand-primary)]">{n}.</span>
        <span>
          {label}
          {required ? <span className="text-red-500"> *</span> : (
            <span className="ml-1.5 text-[11px] font-normal text-[var(--muted)]">
              {t('common.optional')}
            </span>
          )}
        </span>
      </Label>
      {help && <p className="text-[11px] leading-relaxed text-[var(--muted)]">{help}</p>}
      {children}
    </div>
  );
}

function ChoiceList({
  options, value, onChange, name,
}: { options: string[]; value: string; onChange: (v: string) => void; name: string }) {
  const { tOption } = useI18n();
  return (
    <div className="space-y-1.5">
      {options.map((o) => (
        <label
          key={o}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2 text-[13px] transition-all duration-150',
            value === o
              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]'
              : 'border-[var(--input-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/40',
          )}
        >
          <input
            type="radio" name={name} checked={value === o} onChange={() => onChange(o)}
            className="mt-0.5 shrink-0 accent-[var(--brand-primary)]"
          />
          <span>{tOption(o)}</span>
        </label>
      ))}
    </div>
  );
}

function CheckList({
  options, values, onToggle, disabledWhenFull,
}: { options: string[]; values: string[]; onToggle: (v: string) => void; disabledWhenFull?: boolean }) {
  const { tOption } = useI18n();
  return (
    <div className="space-y-1.5">
      {options.map((o) => {
        const checked = values.includes(o);
        const blocked = !!disabledWhenFull && !checked;
        return (
          <label
            key={o}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-3.5 py-2 text-[13px] transition-all duration-150',
              blocked ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
              checked
                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]'
                : 'border-[var(--input-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/40',
            )}
          >
            <input
              type="checkbox" checked={checked} disabled={blocked} onChange={() => onToggle(o)}
              className="mt-0.5 shrink-0 accent-[var(--brand-primary)]"
            />
            <span>{tOption(o)}</span>
          </label>
        );
      })}
    </div>
  );
}

interface Props {
  slot: DemoSlotPublic | null;
  onClose: () => void;
  onBooked: (pilot: boolean) => void;
}

/**
 * Booking popup: the Early Access questionnaire.
 *
 * Picking a slot and qualifying happen in one step, so a booking and its answers
 * are a single request the admin sees in one list.
 */
export function DemoBookingModal({ slot, onClose, onBooked }: Props) {
  const { t, m, intlLocale } = useI18n();
  const steps = m.demo.modal.steps;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));
  const toggle = (k: 'marketsActive' | 'marketsTargeting' | 'certifications' | 'challenges', v: string) =>
    setForm((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  const personalEmailHint = useMemo(() => {
    const domain = form.email.split('@')[1]?.toLowerCase() ?? '';
    return EA_PERSONAL_EMAIL_DOMAINS.some((d) => domain.startsWith(`${d}.`));
  }, [form.email]);

  const isConsultant = form.role === 'Quality & regulatory consultant';

  const stepError = (s: number): string | null => {
    if (s === 0) {
      if (form.fullName.trim().length < 2) return t('demo.modal.errors.fullName');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return t('demo.modal.errors.email');
      if (form.companyName.trim().length < 2) return t('demo.modal.errors.companyName');
      if (!form.role) return t('demo.modal.errors.role');
      if (form.role === 'Other' && !form.roleOther.trim()) return t('demo.modal.errors.roleOther');
      if (isConsultant && !form.consultingScope) {
        return t('demo.modal.errors.consultingScope');
      }
      return null;
    }
    if (s === 1) {
      if (!form.field) return t('demo.modal.errors.field');
      if (!form.companyCapacity) return t('demo.modal.errors.companyCapacity');
      if (form.marketsActive.length === 0 && form.marketsTargeting.length === 0) {
        return t('demo.modal.errors.markets');
      }
      if (form.certifications.includes('Other') && !form.certificationsOther.trim()) {
        return t('demo.modal.errors.certificationsOther');
      }
      return null;
    }
    if (!form.complianceToday) return t('demo.modal.errors.complianceToday');
    if (form.complianceToday === 'A QMS or eQMS already in place' && !form.qmsName.trim()) {
      return t('demo.modal.errors.qmsName');
    }
    if (form.challenges.length === 0) return t('demo.modal.errors.challenges');
    if (form.challenges.includes('Other') && !form.challengesOther.trim()) {
      return t('demo.modal.errors.challengesOther');
    }
    if (!form.timeline) return t('demo.modal.errors.timeline');
    if (!form.decisionRole) return t('demo.modal.errors.decisionRole');
    if (!form.pilotInterest) return t('demo.modal.errors.pilotInterest');
    if (!form.consentContact) return t('demo.modal.errors.consent');
    return null;
  };

  const close = () => {
    if (submitting) return;
    onClose();
    setTimeout(() => { setForm(EMPTY); setStep(0); }, 220);
  };

  const next = () => {
    const err = stepError(step);
    if (err) return toast.error(err);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const submit = async () => {
    if (!slot) return;
    const err = stepError(2);
    if (err) return toast.error(err);
    setSubmitting(true);
    try {
      await demoApi.book({
        slotId: slot.id,
        ...form,
        roleOther: form.roleOther.trim() || undefined,
        phone: form.phone.trim() || undefined,
        consultingScope: form.consultingScope || undefined,
        certifications: form.certifications.length ? form.certifications : undefined,
        certificationsOther: form.certificationsOther.trim() || undefined,
        productCount: form.productCount || undefined,
        qmsName: form.qmsName.trim() || undefined,
        challengesOther: form.challengesOther.trim() || undefined,
        description: form.description.trim() || undefined,
        preferredLanguage: form.preferredLanguage || undefined,
      });
      onBooked(form.pilotInterest.startsWith('Yes'));
      setForm(EMPTY);
      setStep(0);
    } catch (e: any) {
      const raw = e?.response?.data?.message ?? t('demo.modal.errors.submit');
      toast.error(Array.isArray(raw) ? raw[0] : String(raw));
      // 409 means someone took the slot while the form was open.
      if (e?.response?.status === 409) onBooked(false);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <Dialog open={!!slot} onOpenChange={(v) => !v && close()}>
      <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-6 pb-4 pt-5">
          <DialogHeader>
            <DialogTitle>{t('demo.modal.title')}</DialogTitle>
            <DialogDescription className="text-[13px]">
              {t('demo.modal.description')}
            </DialogDescription>
          </DialogHeader>

          {slot && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/5 p-3">
              <Calendar className="h-5 w-5 shrink-0 text-[var(--brand-primary)]" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {formatSlot(slot.startsAt, intlLocale)}
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  {t('demo.modal.slotDuration', { minutes: slot.durationMinutes })}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-[var(--muted)]">
              <span>
                {t('demo.modal.stepProgress', {
                  current: step + 1,
                  total: steps.length,
                  label: steps[step],
                })}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--nav-hover)]">
              <div className="h-full bg-[var(--brand-primary)] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {step === 0 && (
            <>
              <Question n={1} label={t('demo.modal.q1')} required>
                <Input
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  placeholder={t('demo.modal.q1Placeholder')}
                />
              </Question>

              <Question n={2} label={t('demo.modal.q2')} required help={t('demo.modal.q2Help')}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder={t('demo.modal.q2Placeholder')}
                />
                {personalEmailHint && (
                  <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                    {t('demo.modal.q2PersonalHint')}
                  </p>
                )}
              </Question>

              <Question n={3} label={t('demo.modal.q3')} required>
                <Input
                  value={form.companyName}
                  onChange={(e) => set('companyName', e.target.value)}
                  placeholder={t('demo.modal.q3Placeholder')}
                />
              </Question>

              <Question n={4} label={t('demo.modal.q4')} required>
                <ChoiceList name="role" options={EA_ROLES} value={form.role} onChange={(v) => set('role', v)} />
                {form.role === 'Other' && (
                  <div className="mt-2.5">
                    <Label className="text-[12px]">
                      {t('demo.modal.q4Other')} <span className="text-red-500">*</span>
                    </Label>
                    <Input value={form.roleOther} onChange={(e) => set('roleOther', e.target.value)} />
                  </div>
                )}
                {isConsultant && (
                  <div className="mt-3 rounded-xl border border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/5 p-3.5">
                    <Label className="text-[12px] font-semibold">
                      {t('demo.modal.q4Consulting')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="mt-2">
                      <ChoiceList name="consultingScope" options={EA_CONSULTING_SCOPES} value={form.consultingScope} onChange={(v) => set('consultingScope', v)} />
                    </div>
                  </div>
                )}
              </Question>

              <Question n={5} label={t('demo.modal.q5')} help={t('demo.modal.q5Help')}>
                <QurelioPhoneInput value={form.phone || undefined} onChange={(v) => set('phone', v ?? '')} />
              </Question>
            </>
          )}

          {step === 1 && (
            <>
              <Question n={6} label={t('demo.modal.q6')} required>
                <ChoiceList name="field" options={EA_INDUSTRIES} value={form.field} onChange={(v) => set('field', v)} />
              </Question>

              <Question n={7} label={t('demo.modal.q7')} required>
                <ChoiceList name="companyCapacity" options={EA_COMPANY_SIZES} value={form.companyCapacity} onChange={(v) => set('companyCapacity', v)} />
              </Question>

              <Question n={8} label={t('demo.modal.q8Active')} required help={t('demo.modal.q8Help')}>
                <CheckList options={EA_MARKETS} values={form.marketsActive} onToggle={(v) => toggle('marketsActive', v)} />
              </Question>

              <Question n={8} label={t('demo.modal.q8Target')}>
                <CheckList options={EA_MARKETS} values={form.marketsTargeting} onToggle={(v) => toggle('marketsTargeting', v)} />
              </Question>

              <Question n={9} label={t('demo.modal.q9')}>
                <CheckList options={EA_CERTIFICATIONS} values={form.certifications} onToggle={(v) => toggle('certifications', v)} />
                {form.certifications.includes('Other') && (
                  <div className="mt-2.5">
                    <Label className="text-[12px]">
                      {t('demo.modal.pleaseSpecify')} <span className="text-red-500">*</span>
                    </Label>
                    <Input value={form.certificationsOther} onChange={(e) => set('certificationsOther', e.target.value)} />
                  </div>
                )}
              </Question>

              <Question n={10} label={t('demo.modal.q10')}>
                <ChoiceList name="productCount" options={EA_PRODUCT_COUNTS} value={form.productCount} onChange={(v) => set('productCount', v)} />
              </Question>
            </>
          )}

          {step === 2 && (
            <>
              <Question n={11} label={t('demo.modal.q11')} required>
                <ChoiceList name="complianceToday" options={EA_COMPLIANCE_TODAY} value={form.complianceToday} onChange={(v) => set('complianceToday', v)} />
                {form.complianceToday === 'A QMS or eQMS already in place' && (
                  <div className="mt-2.5">
                    <Label className="text-[12px]">
                      {t('demo.modal.q11Which')} <span className="text-red-500">*</span>
                    </Label>
                    <Input value={form.qmsName} onChange={(e) => set('qmsName', e.target.value)} />
                  </div>
                )}
              </Question>

              <Question
                n={12}
                label={t('demo.modal.q12', { max: EA_MAX_CHALLENGES })}
                required
                help={t('demo.modal.q12Help', {
                  selected: form.challenges.length,
                  max: EA_MAX_CHALLENGES,
                })}
              >
                <CheckList
                  options={EA_CHALLENGES}
                  values={form.challenges}
                  onToggle={(v) => toggle('challenges', v)}
                  disabledWhenFull={form.challenges.length >= EA_MAX_CHALLENGES}
                />
                {form.challenges.includes('Other') && (
                  <div className="mt-2.5">
                    <Label className="text-[12px]">
                      {t('demo.modal.pleaseSpecify')} <span className="text-red-500">*</span>
                    </Label>
                    <Input value={form.challengesOther} onChange={(e) => set('challengesOther', e.target.value)} />
                  </div>
                )}
              </Question>

              <Question n={13} label={t('demo.modal.q13')} required>
                <ChoiceList name="timeline" options={EA_TIMELINES} value={form.timeline} onChange={(v) => set('timeline', v)} />
              </Question>

              <Question n={14} label={t('demo.modal.q14')} required>
                <ChoiceList name="decisionRole" options={EA_DECISION_ROLES} value={form.decisionRole} onChange={(v) => set('decisionRole', v)} />
              </Question>

              <Question
                n={15}
                label={t('demo.modal.q15')}
                required
                help={t('demo.modal.q15Help')}
              >
                <ChoiceList name="pilotInterest" options={EA_PILOT_ANSWERS} value={form.pilotInterest} onChange={(v) => set('pilotInterest', v)} />
              </Question>

              <Question
                n={16}
                label={t('demo.modal.q16')}
                help={t('demo.modal.q16Help')}
              >
                <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </Question>

              <Question n={17} label={t('demo.modal.q17')}>
                <ChoiceList name="preferredLanguage" options={EA_LANGUAGES} value={form.preferredLanguage} onChange={(v) => set('preferredLanguage', v)} />
              </Question>

              <Question n={18} label={t('demo.modal.q18')} required>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--input-border)] bg-[var(--surface)] px-3.5 py-2.5 text-[12px] leading-relaxed">
                  <input
                    type="checkbox" checked={form.consentContact}
                    onChange={(e) => set('consentContact', e.target.checked)}
                    className="mt-0.5 shrink-0 accent-[var(--brand-primary)]"
                  />
                  <span>
                    {t('demo.modal.consentContact', {
                      entity: EA_LEGAL_ENTITY,
                      email: EA_CONTACT_EMAIL,
                    })}
                    <span className="text-red-500"> *</span>
                  </span>
                </label>
                <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--input-border)] bg-[var(--surface)] px-3.5 py-2.5 text-[12px] leading-relaxed">
                  <input
                    type="checkbox" checked={form.consentMarketing}
                    onChange={(e) => set('consentMarketing', e.target.checked)}
                    className="mt-0.5 shrink-0 accent-[var(--brand-primary)]"
                  />
                  <span>
                    {t('demo.modal.consentMarketing')}
                    <span className="ml-1 text-[var(--muted)]">({t('common.optional').toLowerCase()})</span>
                  </span>
                </label>
              </Question>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-3">
          <p className="hidden text-[11px] text-[var(--muted)] sm:block">
            {t('demo.modal.replyNote', { hours: EA_RESPONSE_HOURS })}
          </p>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={submitting} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('common.previous')}
              </Button>
            ) : (
              <Button variant="outline" onClick={close} disabled={submitting}>
                {t('common.cancel')}
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button onClick={next} className="gap-2">
                {t('common.continue')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t('demo.modal.submit')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
