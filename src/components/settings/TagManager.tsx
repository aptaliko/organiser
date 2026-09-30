'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { api } from '@/lib/apiClient';
import { PencilIcon, TrashIcon } from '../icons';
import { Sheet } from '../Sheet';
import type { TagOption } from '../TagInput';
import { useToast } from '../Toast';
import { Button, Card, TextInput } from '../ui';

/** Rename or delete the household's tags (tap a tag to see its items). */
export function TagManager({ tags }: { tags: TagOption[] }) {
  const { t } = useT();
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState<TagOption | null>(null);

  if (tags.length === 0) return <p className="px-1 text-sm text-muted">{t('tagsAdmin.empty')}</p>;

  async function rename() {
    const { ok, data } = await api(`/api/tags/${editing!.id}`, 'PATCH', { name: editing!.name });
    if (!ok) return toast(data.error === 'tag_exists' ? t('tagsAdmin.exists') : t('common.error'));
    setEditing(null);
    router.refresh();
  }

  return (
    <Card className="p-2">
      <ul>
        {tags.map((tag) => (
          <li key={tag.id} className="flex min-h-12 items-center gap-2 px-2">
            {editing?.id === tag.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editing.name.trim()) void rename();
                }}
              >
                <TextInput autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={60} aria-label={t('tagsAdmin.rename', { name: tag.name })} />
                <Button type="submit" variant="secondary">
                  {t('common.save')}
                </Button>
              </form>
            ) : (
              <>
                <Link href={`/?tag=${tag.id}`} className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="truncate">{tag.name}</span>
                </Link>
                <button onClick={() => setEditing({ id: tag.id, name: tag.name })} aria-label={t('tagsAdmin.rename', { name: tag.name })} className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-2">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleting(tag)} aria-label={t('tagsAdmin.delete', { name: tag.name })} className="flex h-10 w-10 items-center justify-center rounded-full text-danger hover:bg-surface-2">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title={t('tagsAdmin.title')} closeLabel={t('common.close')}>
        <p className="mb-4">{t('tagsAdmin.deleteConfirm', { name: deleting?.name ?? '' })}</p>
        <div className="flex flex-col gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              const { ok } = await api(`/api/tags/${deleting!.id}`, 'DELETE');
              setDeleting(null);
              if (!ok) toast(t('common.error'));
              router.refresh();
            }}
          >
            {t('common.delete')}
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}
