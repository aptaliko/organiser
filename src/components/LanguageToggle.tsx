'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { LOCALES, type Locale } from '@/i18n';
import { setLocaleCookie } from '@/i18n/localeCookie';

const LABELS: Record<Locale, string> = { en: 'EN', el: 'ΕΛ' };

/**
 * Segmented EN | ΕΛ switch. Signed out it only sets a cookie; signed in (`persist`) it also
 * saves the choice on the account so it follows the user to other devices.
 */
export function LanguageToggle({ persist = false }: { persist?: boolean }) {
  const { locale } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function choose(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    if (persist) {
      await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
    }
    startTransition(() => router.refresh());
  }

  return (
    <div role="radiogroup" className={`inline-flex self-start rounded-xl border border-border bg-surface p-1 ${pending ? 'opacity-60' : ''}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={l === locale}
          onClick={() => choose(l)}
          className={`min-h-10 min-w-12 rounded-lg px-3 text-sm font-semibold ${
            l === locale ? 'bg-accent text-on-accent' : 'text-muted'
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
