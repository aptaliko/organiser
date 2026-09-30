import Link from 'next/link';
import { ChevronRightIcon } from './icons';

/** Warehouse › Room 2 › Blue box — every step tappable. `current` renders unlinked. */
export function Breadcrumb({
  path,
  current,
}: {
  path: { id: number; name: string }[];
  current?: string;
}) {
  if (path.length === 0 && !current) return null;
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted">
      {path.map((a, i) => (
        <span key={a.id} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />}
          <Link href={`/areas/${a.id}`} className="rounded px-0.5 py-1 hover:text-accent hover:underline">
            {a.name}
          </Link>
        </span>
      ))}
      {current && (
        <span className="inline-flex items-center gap-1">
          {path.length > 0 && <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />}
          <span aria-current="page" className="font-medium text-text">
            {current}
          </span>
        </span>
      )}
    </nav>
  );
}
