'use client';

import React, { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff } from '@/components/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { QurelioLogo } from '@/components/brand/qurelio-logo';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createPasswordPolicy,
  type AccountValidationMessages,
} from '@/lib/account-validation';
import { createFieldErrorToast } from '@/lib/form-errors';
import { useI18n } from '@/i18n';

interface SchemaMessages extends AccountValidationMessages {
  passwordMismatch: string;
}

function buildSchema(messages: SchemaMessages) {
  return z
    .object({
      newPassword: createPasswordPolicy(messages),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: messages.passwordMismatch,
      path: ['confirmPassword'],
    });
}
type FormData = z.infer<ReturnType<typeof buildSchema>>;

function SetupAccountForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const code = params.get('code') || '';

  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(
    () =>
      buildSchema({
        passwordMismatch: t('auth.setupAccount.errors.passwordMismatch'),
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
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: FormData) => {
    if (!email || !code) {
      toast.error(t('auth.setupAccount.invalidLink'));
      return;
    }
    setLoading(true);
    try {
      await authApi.setupAccount({ email, code, newPassword: data.newPassword });
      toast.success(t('auth.setupAccount.success'));
      router.push('/auth/login');
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      toast.error(Array.isArray(m) ? m.join(' ') : m || t('auth.setupAccount.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-bg)]">
      <div className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text-primary)]"
        >
          ← {t('common.backToSignIn')}
        </Link>
        <div className="flex justify-end">
          <QurelioLogo height={28} />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-[420px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-lg shadow-black/20"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--nav-hover)]">
            <Lock className="h-8 w-8 text-[var(--brand-primary)]" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
            {t('auth.setupAccount.title')}
          </h1>
          <p className="mb-1 text-sm text-[var(--muted)]">{t('auth.setupAccount.sub')}</p>
          <p className="mb-6 font-semibold text-[var(--brand-primary)]">{email}</p>

          <form className="space-y-4 text-left" onSubmit={handleSubmit(
              onSubmit,
              createFieldErrorToast(t('auth.validation.fixHighlighted')),
            )}>
            <div>
              <Label htmlFor="newPassword">{t('auth.setupAccount.newPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPwd ? 'text' : 'password'}
                  className="pr-10"
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)]"
                  onClick={() => setShowPwd(!showPwd)}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
              <p className="mt-1 text-xs text-[var(--muted)]">
                {t('auth.setupAccount.passwordHint')}
              </p>
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('auth.setupAccount.confirmPasswordLabel')}</Label>
              <Input id="confirmPassword" type={showPwd ? 'text' : 'password'} {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth.setupAccount.submitting') : t('auth.setupAccount.submit')}
            </Button>
          </form>

          <Link href="/auth/login" className="mt-6 inline-block text-sm text-[var(--muted)] hover:text-[var(--text-primary)]">
            {t('auth.setupAccount.backToSignIn')}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function AuthLoadingScreen() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] text-[var(--muted)]">
      {t('common.loading')}
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <AuthLoadingScreen />
      }
    >
      <SetupAccountForm />
    </Suspense>
  );
}
