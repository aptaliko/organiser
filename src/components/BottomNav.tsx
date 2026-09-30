'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import type { TKey } from '@/i18n';
import { PlacesIcon, PlusIcon, SearchIcon, SettingsIcon } from './icons';

const TABS: { href: string; label: TKey; Icon: typeof SearchIcon }[] = [
  { href: '/', label: 'nav.search', Icon: SearchIcon },
  { href: '/places', label: 'nav.places', Icon: PlacesIcon },
  { href: '/add', label: 'nav.add', Icon: PlusIcon },
  { href: '/settings', label: 'nav.settings', Icon: SettingsIcon },
];

export function BottomNav() {
  const { t } = useT();
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                {href === '/add' ? (
                  <span className="flex h-8 w-12 items-center justify-center rounded-full bg-accent text-on-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                ) : (
                  <Icon className="h-6 w-6" />
                )}
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
