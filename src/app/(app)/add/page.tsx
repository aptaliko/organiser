import Link from 'next/link';
import { BoxIcon, ChevronRightIcon, ItemIcon } from '@/components/icons';
import { getT } from '@/i18n/server';

export default async function AddPage() {
  const { t } = await getT();
  const choices = [
    { href: '/add/item', title: t('add.item'), hint: t('add.itemHint'), Icon: ItemIcon },
    { href: '/add/place', title: t('add.place'), hint: t('add.placeHint'), Icon: BoxIcon },
  ];
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('add.title')}</h1>
      <ul className="flex flex-col gap-3">
        {choices.map(({ href, title, hint, Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5 hover:border-accent">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Icon className="h-7 w-7" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">{title}</span>
                <span className="block text-sm text-muted">{hint}</span>
              </span>
              <ChevronRightIcon className="h-5 w-5 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
