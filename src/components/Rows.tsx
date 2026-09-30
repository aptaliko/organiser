import Link from 'next/link';
import { ChevronRightIcon } from './icons';
import { Thumb } from './Thumb';

/** A tappable list row: thumbnail, title, subtitle, chevron. */
export function LinkRow({
  href,
  kind,
  coverUrl,
  title,
  subtitle,
  badge,
}: {
  href: string;
  kind: 'area' | 'item';
  coverUrl: string | null;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
}) {
  return (
    <li>
      <Link href={href} className="flex min-h-16 items-center gap-3 rounded-2xl px-2 py-2 hover:bg-surface-2">
        <Thumb url={coverUrl} kind={kind} size={48} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{title}</span>
            {badge && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{badge}</span>}
          </span>
          {subtitle && <span className="block truncate text-sm text-muted">{subtitle}</span>}
        </span>
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-1 mt-6 flex items-center justify-between px-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}
