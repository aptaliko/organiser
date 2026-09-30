'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { rememberRecent } from '@/lib/recentLocations';
import type { PhotoInput } from '@/lib/schemas';
import { pickDims, type Dims } from '@/lib/units';
import { DimsInput } from './DimsInput';
import { ChevronDownIcon } from './icons';
import { LocationField, type PickerArea } from './LocationPicker';
import { PendingPhotos } from './PendingPhotos';
import { useToast } from './Toast';
import { Alert, Button, Field, TextInput } from './ui';

export interface AreaFormValues extends Dims {
  id: number;
  parentId: number | null;
  name: string;
  description: string | null;
  address: string | null;
}

const EMPTY_DIMS: Dims = { widthCm: null, depthCm: null, heightCm: null };

export function AreaForm({
  mode,
  householdId,
  areas: initialAreas,
  area,
  defaultParentId,
}: {
  mode: 'create' | 'edit';
  householdId: number;
  areas: PickerArea[];
  area?: AreaFormValues;
  defaultParentId?: number | null;
}) {
  const { t } = useT();
  const toast = useToast();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [areas, setAreas] = useState(initialAreas);
  const [photos, setPhotos] = useState<PhotoInput[]>([]);
  const [name, setName] = useState(area?.name ?? '');
  const [parentId, setParentId] = useState<number | null>(area?.parentId ?? defaultParentId ?? null);
  const [showDetails, setShowDetails] = useState(mode === 'edit');
  const [dims, setDims] = useState<Dims | null>(area ? pickDims(area) : EMPTY_DIMS);
  const [address, setAddress] = useState(area?.address ?? '');
  const [description, setDescription] = useState(area?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const topLevel = parentId === null;

  async function save() {
    if (!name.trim()) {
      setError(t('form.nameRequired'));
      nameRef.current?.focus();
      return;
    }
    if (!dims) {
      setShowDetails(true);
      return;
    }
    setSaving(true);
    setError(null);
    const fields = {
      name: name.trim(),
      ...dims,
      description: description.trim() || null,
      address: topLevel ? address.trim() || null : null,
    };
    try {
      const res =
        mode === 'create'
          ? await fetch('/api/areas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...fields, parentId, photos }),
            })
          : await fetch(`/api/areas/${area!.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fields),
            });
      if (!res.ok) throw new Error(String(res.status));
      const id = mode === 'create' ? ((await res.json()) as { id: number }).id : area!.id;
      if (mode === 'create') rememberRecent(householdId, id);
      toast(t('common.saved'));
      router.replace(`/areas/${id}`);
      router.refresh();
    } catch {
      setError(t('common.error'));
      setSaving(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {error && <Alert>{error}</Alert>}

      {mode === 'create' && (
        <div className="flex flex-col gap-2">
          <PendingPhotos value={photos} onChange={setPhotos} />
          <p className="text-sm text-muted">{t('photos.placeHint')}</p>
        </div>
      )}

      <Field label={t('form.name')}>
        <TextInput
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.placeNamePlaceholder')}
          maxLength={120}
          autoFocus={mode === 'create'}
        />
      </Field>

      {mode === 'create' && (
        <LocationField
          label={t('form.insidePlace')}
          areas={areas}
          onAreasChange={setAreas}
          householdId={householdId}
          value={parentId}
          onChange={setParentId}
          noneLabel={t('form.topLevel')}
          placeholder={t('form.topLevel')}
        />
      )}

      <button
        type="button"
        onClick={() => setShowDetails((s) => !s)}
        aria-expanded={showDetails}
        className="flex min-h-11 items-center gap-1 self-start font-medium text-accent"
      >
        <ChevronDownIcon className={`h-5 w-5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        {showDetails ? t('common.fewerDetails') : t('common.moreDetails')}
      </button>

      {showDetails && (
        <div className="flex flex-col gap-5">
          <DimsInput initial={area ? pickDims(area) : EMPTY_DIMS} onChange={setDims} />
          {topLevel && (
            <Field label={t('form.address')} hint={t('form.addressHint')}>
              <TextInput value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500} autoComplete="street-address" />
            </Field>
          )}
          <Field label={t('form.description')}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form.descriptionPlaceholder')}
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </Field>
        </div>
      )}

      <Button type="submit" disabled={saving} className="mt-2">
        {t('common.save')}
      </Button>
    </form>
  );
}
