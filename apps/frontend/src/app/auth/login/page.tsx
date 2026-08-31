'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from '@/components/icons';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { authApi } from '@/lib/api';
import { useAuthStore, type User } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/i18n';

const REMEMBER_EMAIL_KEY = 'qurelio-remember-email';

function buildSchema(messages: { email: string; password: string }) {
  return z.object({
    email: z.string().email(messages.email),
    password: z.string().min(6, messages.password),
    remember: z.boolean(),
  });
}
type FormData = z.infer<ReturnType<typeof buildSchema>>;

/** Map API user to store shape (API uses isEmailVerified; store uses isVerified). */
function mapLoginUser(raw: Record<string, unknown>): User {
  const company = raw.company as { id: string; name: string; field?: string } | null | undefined;
  return {
    id: String(raw.id),
    firstName: String(raw.firstName ?? ''),
    lastName: String(raw.lastName ?? ''),
    email: String(raw.email ?? ''),
    phone: String(raw.phone ?? ''),
    role: raw.role as User['role'],
    isVerified: Boolean(raw.isEmailVerified ?? raw.isVerified),
    isActive: Boolean(raw.isActive),
    companyId: raw.companyId as string | undefined,
    company: company
      ? { id: company.id, name: company.name, field: company.field ?? '' }
      : undefined,
    avatarUrl:
      raw.avatarUrl != null && String(raw.avatarUrl).length > 0 ? String(raw.avatarUrl) : null,
    hasCustomAvatar: Boolean(raw.hasCustomAvatar),
    avatarKey: raw.avatarKey != null ? String(raw.avatarKey) : null,
  };
}

function postLoginPath(role: User['role']): string {
  if (role === 'SUPER_ADMIN') return '/admin/companies';
  return '/dashboard';
}

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(
    () =>
      buildSchema({
        email: t('auth.validation.email'),
        password: t('auth.validation.passwordMinLogin'),
      }),
    [t],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        reset({ email: saved, password: '', remember: true });
      }
    } catch {
      /* ignore */
    }
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.loginUser({ email: data.email, password: data.password });
      const accessToken = res.data.accessToken ?? res.data.token;
      if (!accessToken) {
        toast.error(t('auth.login.errorMissingToken'));
        return;
      }
      const user = mapLoginUser(res.data.user as Record<string, unknown>);
      const refreshToken =
        typeof res.data.refreshToken === 'string' ? res.data.refreshToken : null;
      setAuth(user, accessToken, refreshToken);
      try {
        if (data.remember) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, data.email);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        /* ignore */
      }
      toast.success(t('auth.login.welcome'));
      router.replace(postLoginPath(user.role));
    } catch (err: unknown) {
      const noResponse = !(err as { response?: unknown }).response;
      if (noResponse) {
        toast.error(t('auth.login.errorNetwork'));
        return;
      }
      const raw = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(' ') : String(raw || '');
      const lower = msg.toLowerCase();
      const email = data.email;

      if (lower.includes('verif')) {
        toast.error(t('auth.login.errorNotVerified'));
        router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
      } else if (
        lower.includes('locked') ||
        lower.includes('too many failed') ||
        lower.includes('failed login attempts')
      ) {
        toast.error(msg || t('auth.login.errorLocked'), { duration: 10000 });
      } else if (
        (err as { response?: { status?: number } })?.response?.status === 401 ||
        lower.includes('invalid') ||
        lower.includes('incorrect') ||
        lower.includes('password')
      ) {
        toast.error(t('auth.login.errorInvalid'));
      } else {
        toast.error(msg || t('auth.login.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.login.heroTitle')}
      subtitle={t('auth.login.heroSubtitle')}
      heroLeft
    >
      <div>
        <h1 className="mb-1 text-2xl font-bold text-[var(--text-primary)]">{t('auth.login.title')}</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">
          {t('auth.login.noAccount')}{' '}
          <Link href="/auth/register" className="font-semibold text-[var(--brand-primary)] hover:underline">
            {t('common.signUp')}
          </Link>
        </p>

        <div className="callout-info mb-6">{t('auth.login.callout')}</div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="email">{t('auth.login.emailLabel')}</Label>
            <Input id="email" type="email" autoComplete="email" placeholder={t('auth.login.emailPlaceholder')} {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="password">{t('auth.login.passwordLabel')}</Label>
              <Link href="/auth/forgot-password" className="text-xs font-semibold text-[var(--brand-primary)] hover:underline">
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:bg-[var(--page-bg)]"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? t('common.hidePassword') : t('common.showPassword')}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="remember"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="remember"
                  name={field.name}
                  ref={field.ref}
                  checked={Boolean(field.value)}
                  onBlur={field.onBlur}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <label htmlFor="remember" className="cursor-pointer text-sm text-[var(--text-primary)]">
              {t('auth.login.remember')}
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          {t('auth.login.newOrganization')}{' '}
          <Link href="/auth/register" className="font-semibold text-[var(--brand-primary)] hover:underline">
            {t('common.signUp')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
