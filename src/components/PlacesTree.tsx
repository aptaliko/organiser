'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import type { TreeNode } from '@/lib/areaTree';
import type { AreaListRow } from '@/db/queries/areas';
import { ChevronDownIcon } from './icons';
import { Thumb } from './Thumb';

type Node = TreeNode<AreaListRow>;

/** Collapsible tree of places. Top-level places start expanded. */
export function PlacesTree({ roots }: { roots: Node[] }) {
  return (
    <ul className="flex flex-col">
      {roots.map((n) => (
        <TreeRow key={n.id} node={n} level={0} />
      ))}
    </ul>
  );
}

function TreeRow({ node, level }: { node: Node; level: number }) {
  const { t } = useT();
  const [open, setOpen] = useState(level === 0);
  const kids = node.children.length;
  const counts = [
    node.itemCount === 1 ? t('places.itemCountOne') : node.itemCount > 0 ? t('places.itemCount', { count: node.itemCount }) : null,
    kids === 1 ? t('places.subCountOne') : kids > 0 ? t('places.subCount', { count: kids }) : null,
  ].filter(Boolean);

  return (
    <li>
      <div className="flex items-center">
        <Link href={`/areas/${node.id}`} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 hover:bg-surface-2">
          <Thumb url={node.coverUrl} kind="area" size={level === 0 ? 48 : 40} />
          <span className="min-w-0">
            <span className={`block truncate ${level === 0 ? 'font-semibold' : 'font-medium'}`}>{node.name}</span>
            {counts.length > 0 && <span className="block truncate text-sm text-muted">{counts.join(' · ')}</span>}
          </span>
        </Link>
        {kids > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? t('places.collapse') : t('places.expand')}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          >
            <ChevronDownIcon className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {open && kids > 0 && (
        <ul className="ml-8 border-l border-border pl-2">
          {node.children.map((c) => (
            <TreeRow key={c.id} node={c} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
