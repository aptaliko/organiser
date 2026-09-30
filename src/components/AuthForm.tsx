'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import type { TKey } from '@/i18n';
import { Alert, Button, Field, TextInput } from './ui';

const ERRORS: Record<string, TKey> = {
  invalid_credentials: 'auth.error.invalidCredentials',
  email_taken: 'auth.error.emailTaken',
  invalid: 'auth.error.invalid',
  invite_invalid: 'invite.invalid',
};

/** Only same-origin relative paths; never `//evil.com` or absolute URLs. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { t, locale } = useT();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<TKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const body =
      mode === 'login'
        ? { email: form.get('email'), password: form.get('password') }
        : {
            name: form.get('name'),
            email: form.get('email'),
            password: form.get('password'),
            locale,
            invite: searchParams.get('invite') ?? undefined,
          };
    try {
      const res = await fetch(`/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        // Full navigation so the root layout re-reads the (now signed-in) user's language.
        window.location.assign(safeNext(searchParams.get('next')));
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(ERRORS[data.error ?? ''] ?? 'auth.error.generic');
    } catch {
      setError('auth.error.generic');
    }
    setSubmitting(false);
  }

  const invite = searchParams.get('invite');
  // Keep an invite through the login/register switch: login returns to the invite page.
  const next = searchParams.get('next') ?? (invite ? `/invite/${invite}` : null);
  const inviteFromNext = next?.match(/^\/invite\/([\w-]+)$/)?.[1];
  const switchHref =
    mode === 'login' && inviteFromNext
      ? `/register?invite=${inviteFromNext}`
      : `${mode === 'login' ? '/register' : '/login'}${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
      {error && <Alert>{t(error)}</Alert>}
      {mode === 'register' && (
        <Field label={t('auth.field.name')}>
          <TextInput name="name" required maxLength={120} autoComplete="name" />
        </Field>
      )}
      <Field label={t('auth.field.email')}>
        <TextInput name="email" type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" />
      </Field>
      <Field label={t('auth.field.password')} hint={mode === 'register' ? t('auth.field.passwordHint') : undefined}>
        <div className="relative">
          <TextInput
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="pr-24"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute inset-y-0 right-1 my-1 rounded-lg px-3 text-sm font-medium text-accent"
            aria-pressed={showPassword}
          >
            {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          </button>
        </div>
      </Field>
      <Button type="submit" disabled={submitting} className="mt-2 w-full">
        {submitting ? t('common.loading') : t(mode === 'login' ? 'auth.login.submit' : 'auth.register.submit')}
      </Button>
      <p className="text-center text-sm text-muted">
        {t(mode === 'login' ? 'auth.login.noAccount' : 'auth.register.haveAccount')}{' '}
        <Link href={switchHref} className="font-semibold text-accent">
          {t(mode === 'login' ? 'auth.login.toRegister' : 'auth.register.toLogin')}
        </Link>
      </p>
    </form>
  );
}
