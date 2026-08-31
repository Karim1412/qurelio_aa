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
import {
  createPasswordPolicy,
  createPhoneE164Required,
  type AccountValidationMessages,
} from '@/lib/account-validation';
import { createFieldErrorToast } from '@/lib/form-errors';
import { useI18n } from '@/i18n';
import { QurelioPhoneInput } from '@/components/ui/phone-input';

/** `value` goes to the API; `label` is the canonical option name translated by `tOption`. */
const ROLES = [
  { value: 'QUALITY_MANAGER', label: 'Quality Manager' },
  { value: 'AUDITOR', label: 'Auditor' },
  { value: 'OPERATOR', label: 'Operator' },
];

interface SchemaMessages extends AccountValidationMessages {
  firstName: string;
  lastName: string;
  email: string;
  companyCode: string;
  role: string;
}

function buildSchema(messages: SchemaMessages) {
  const companyCodeSchema = z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^QUR[A-Z0-9]{5}$/, messages.companyCode));

  return z.object({
    firstName: z.string().min(2, messages.firstName),
    lastName: z.string().min(2, messages.lastName),
    email: z.string().email(messages.email),
    phone: createPhoneE164Required(messages),
    companyCode: companyCodeSchema,
    role: z.string().min(1, messages.role),
    password: createPasswordPolicy(messages),
  });
}
type FormData = z.infer<ReturnType<typeof buildSchema>>;

export default function RegisterUserPage() {
  const { t, tOption } = useI18n();
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(
    () =>
      buildSchema({
        firstName: t('auth.registerUser.errors.firstName'),
        lastName: t('auth.registerUser.errors.lastName'),
        email: t('auth.validation.email'),
        companyCode: t('auth.registerUser.errors.companyCode'),
        role: t('auth.registerUser.errors.role'),
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
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      companyCode: '',
      role: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authApi.registerUser(data);
      toast.success(t('auth.registerUser.success'));
      router.push(`/auth/verify-otp?email=${encodeURIComponent(data.email)}&type=user`);
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const msg = Array.isArray(m) ? m.join(' ') : m || t('auth.registerUser.error');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectClass =
    'flex h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:border-[var(--brand-primary)] focus-visible:shadow-[0_0_0_3px_rgba(77,146,196,0.2)]';

  return (
    <AuthLayout
      title={t('auth.registerUser.heroTitle')}
      subtitle={t('auth.registerUser.heroSubtitle')}
      heroLeft
    >
      <div>
        <h1 className="mb-1 text-2xl font-bold text-[var(--text-primary)]">
          {t('auth.registerUser.title')}
        </h1>
        <p className="mb-2 text-sm text-[var(--muted)]">
          {t('auth.registerUser.alreadyHaveAccount')}{' '}
          <Link href="/auth/login" className="font-semibold text-[var(--brand-primary)] hover:underline">
            {t('common.signIn')}
          </Link>
        </p>
        <p className="mb-6 text-sm text-[var(--muted)]">
          {t('auth.registerUser.creatingOrganization')}{' '}
          <Link href="/auth/register-company" className="font-semibold text-[var(--brand-primary)] hover:underline">
            {t('auth.registerUser.registerCompanyLink')}
          </Link>
        </p>

        <form className="space-y-4" onSubmit={handleSubmit(
            onSubmit,
            createFieldErrorToast(t('auth.validation.fixHighlighted')),
          )}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">{t('auth.registerUser.firstNameLabel')}</Label>
              <Input
                id="firstName"
                placeholder={t('auth.registerUser.firstNamePlaceholder')}
                {...register('firstName')}
              />
              {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">{t('auth.registerUser.lastNameLabel')}</Label>
              <Input
                id="lastName"
                placeholder={t('auth.registerUser.lastNamePlaceholder')}
                {...register('lastName')}
              />
              {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <Label htmlFor="email">{t('auth.registerUser.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.registerUser.emailPlaceholder')}
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="min-w-0">
              <Label htmlFor="phone">{t('auth.registerUser.phoneLabel')}</Label>
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

          <div>
            <Label htmlFor="companyCode">{t('auth.registerUser.companyCodeLabel')}</Label>
            <Input
              id="companyCode"
              placeholder={t('auth.registerUser.companyCodePlaceholder')}
              autoComplete="off"
              spellCheck={false}
              className="font-mono uppercase tracking-wide"
              {...register('companyCode')}
            />
            {errors.companyCode && <p className="mt-1 text-xs text-red-600">{errors.companyCode.message}</p>}
            
          </div>

          <div>
            <Label htmlFor="password">{t('auth.registerUser.passwordLabel')}</Label>
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
            <Label htmlFor="role">{t('auth.registerUser.roleLabel')}</Label>
            <select id="role" className={selectClass} defaultValue="" {...register('role', { required: true })}>
              <option value="" disabled>
                {t('auth.registerUser.rolePlaceholder')}
              </option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {tOption(r.label)}
                </option>
              ))}
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.registerUser.submitting') : t('auth.registerUser.submit')}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
