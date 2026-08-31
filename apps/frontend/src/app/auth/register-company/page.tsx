'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from '@/components/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createPasswordPolicy,
  createPhoneE164Required,
  type AccountValidationMessages,
} from '@/lib/account-validation';
import { createFieldErrorToast } from '@/lib/form-errors';
import { useI18n } from '@/i18n';
import { QurelioPhoneInput } from '@/components/ui/phone-input';

/** Values submitted to the API; only the visible label is translated. */
const FIELDS = [
  'Manufacturing',
  'Healthcare',
  'Technology',
  'Finance',
  'Retail',
  'Construction',
  'Education',
  'Logistics',
  'Food & Beverage',
  'Other',
];

const CAPACITIES = ['1-10', '11-50', '51-200', '201-500', '500+'];

interface SchemaMessages extends AccountValidationMessages {
  companyName: string;
  field: string;
  email: string;
  description: string;
  capacity: string;
  passwordMismatch: string;
}

function buildSchema(messages: SchemaMessages) {
  return z
    .object({
      companyName: z.string().min(2, messages.companyName),
      field: z.string().min(1, messages.field),
      email: z.string().email(messages.email),
      phone: createPhoneE164Required(messages),
      description: z.string().min(10, messages.description),
      companyCapacity: z.string().min(1, messages.capacity),
      password: createPasswordPolicy(messages),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: messages.passwordMismatch,
      path: ['confirmPassword'],
    });
}
type FormData = z.infer<ReturnType<typeof buildSchema>>;

export default function RegisterCompanyPage() {
  const { t, tOption } = useI18n();
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(
    () =>
      buildSchema({
        companyName: t('auth.registerCompany.errors.companyName'),
        field: t('auth.registerCompany.errors.field'),
        email: t('auth.validation.email'),
        description: t('auth.registerCompany.errors.description'),
        capacity: t('auth.registerCompany.errors.capacity'),
        passwordMismatch: t('auth.registerCompany.errors.passwordMismatch'),
        passwordMin: t('auth.validation.passwordMin'),
        passwordMax: t('auth.validation.passwordMax'),
        passwordComplexity: t('auth.validation.passwordComplexity'),
        phoneRequired: t('auth.validation.phoneRequired'),
        phoneInvalid: t('auth.validation.phoneInvalid'),
      }),
    [t],
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      companyName: '',
      field: '',
      email: '',
      phone: '',
      description: '',
      companyCapacity: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authApi.registerCompany(data);
      toast.success(t('auth.registerCompany.success'));
      router.push(`/auth/verify-otp?email=${encodeURIComponent(data.email)}&type=company`);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          t('auth.registerCompany.error')
      );
    } finally {
      setLoading(false);
    }
  };

  const selectClass =
    'flex h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:border-[var(--brand-primary)] focus-visible:shadow-[0_0_0_3px_rgba(77,146,196,0.2)]';

  return (
    <AuthLayout
      title={t('auth.registerCompany.heroTitle')}
      subtitle={t('auth.registerCompany.heroSubtitle')}
      heroLeft
    >
      <div>
        <h1 className="mb-1 text-2xl font-bold text-[var(--text-primary)]">
          {t('auth.registerCompany.title')}
        </h1>
        <p className="mb-2 text-sm text-[var(--muted)]">
          {t('auth.registerCompany.alreadyHaveAccount')}{' '}
          <Link href="/auth/login" className="font-semibold text-[var(--brand-primary)] hover:underline">
            {t('common.signIn')}
          </Link>
        </p>
        <p className="mb-6 text-sm text-[var(--muted)]">
          {t('auth.registerCompany.joiningInstead')}{' '}
          <Link href="/auth/register-user" className="font-semibold text-[var(--brand-primary)] hover:underline">
            {t('auth.registerCompany.joinAsMember')}
          </Link>
          {' · '}
          <Link href="/auth/register" className="font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--brand-primary)] hover:underline">
           
          </Link>
        </p>

        <form className="space-y-4" onSubmit={handleSubmit(
            onSubmit,
            createFieldErrorToast(t('auth.validation.fixHighlighted')),
          )}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="companyName">{t('auth.registerCompany.companyNameLabel')}</Label>
              <Input id="companyName" {...register('companyName')} />
              {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="field">{t('auth.registerCompany.fieldLabel')}</Label>
              <select id="field" className={selectClass} defaultValue="" {...register('field', { required: true })}>
                <option value="" disabled>
                  {t('auth.registerCompany.fieldPlaceholder')}
                </option>
                {FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {tOption(f)}
                  </option>
                ))}
              </select>
              {errors.field && <p className="mt-1 text-xs text-red-600">{errors.field.message}</p>}
            </div>
            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <Label htmlFor="email">{t('auth.registerCompany.emailLabel')}</Label>
                <Input id="email" type="email" placeholder={t('auth.registerCompany.emailPlaceholder')} {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div className="min-w-0">
                <Label htmlFor="phone">{t('auth.registerCompany.phoneLabel')}</Label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <QurelioPhoneInput
                      id="phone"
                      value={field.value ? field.value : undefined}
                      onChange={(v) => field.onChange(v ?? '')}
                      onBlur={field.onBlur}
                      error={Boolean(errors.phone)}
                    />
                  )}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
                
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">{t('auth.registerCompany.descriptionLabel')}</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder={t('auth.registerCompany.descriptionPlaceholder')}
                {...register('description')}
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="companyCapacity">{t('auth.registerCompany.capacityLabel')}</Label>
              <select
                id="companyCapacity"
                className={selectClass}
                defaultValue=""
                {...register('companyCapacity', { required: true })}
              >
                <option value="" disabled>
                  {t('auth.registerCompany.capacityPlaceholder')}
                </option>
                {CAPACITIES.map((c) => (
                  <option key={c} value={c}>
                    {tOption(c)} {t('auth.registerCompany.capacitySuffix')}
                  </option>
                ))}
              </select>
              {errors.companyCapacity && (
                <p className="mt-1 text-xs text-red-600">{errors.companyCapacity.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">{t('auth.registerCompany.passwordLabel')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)]"
                  onClick={() => setShowPwd(!showPwd)}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('auth.registerCompany.confirmPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  className="pr-10"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)]"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>


          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.registerCompany.submitting') : t('auth.registerCompany.submit')}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
