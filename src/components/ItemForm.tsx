'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { loadRecent, rememberRecent } from '@/lib/recentLocations';
import type { PhotoInput } from '@/lib/schemas';
import { pickDims, type Dims } from '@/lib/units';
import { DimsInput } from './DimsInput';
import { ChevronDownIcon } from './icons';
import { LocationField, type PickerArea } from './LocationPicker';
import { PendingPhotos } from './PendingPhotos';
import { TagInput, type TagOption } from './TagInput';
import { useToast } from './Toast';
import { Alert, Button, Field, TextInput } from './ui';

export interface ItemFormValues extends Dims {
  id: number;
  name: string;
  description: string | null;
  quantity: number;
  tags: TagOption[];
}

const EMPTY_DIMS: Dims = { widthCm: null, depthCm: null, heightCm: null };

/**
 * Quick add first: photo → name → place, then Save. Quantity, dimensions, tags and
 * description sit behind "More details". In edit mode the place isn't shown — changing
 * it is a move.
 */
export function ItemForm({
  mode,
  householdId,
  areas: initialAreas,
  tags,
  item,
  defaultAreaId,
}: {
  mode: 'create' | 'edit';
  householdId: number;
  areas: PickerArea[];
  tags: TagOption[];
  item?: ItemFormValues;
  /** From ?areaId= ("Add item here"); undefined → most recently used place. */
  defaultAreaId?: number;
}) {
  const { t } = useT();
  const toast = useToast();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [areas, setAreas] = useState(initialAreas);
  const [photos, setPhotos] = useState<PhotoInput[]>([]);
  const [name, setName] = useState(item?.name ?? '');
  const [areaId, setAreaId] = useState<number | null>(defaultAreaId ?? null);
  const [showDetails, setShowDetails] = useState(mode === 'edit');
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [dims, setDims] = useState<Dims | null>(item ? pickDims(item) : EMPTY_DIMS);
  const [itemTags, setItemTags] = useState<TagOption[]>(item?.tags ?? []);
  const [description, setDescription] = useState(item?.description ?? '');
  const [formKey, setFormKey] = useState(0); // remounts DimsInput after "save & add another"
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Default to the last place used on this device. Client-only (localStorage), so it runs
    // after hydration rather than in the initial state.
    if (mode !== 'create' || defaultAreaId !== undefined) return;
    const known = new Set(initialAreas.map((a) => a.id));
    const recent = loadRecent(householdId).find((id) => known.has(id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (recent !== undefined) setAreaId(recent);
  }, [mode, defaultAreaId, householdId, initialAreas]);

  async function save(another: boolean) {
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
      quantity,
      ...dims,
      tagIds: itemTags.map((tag) => tag.id),
      description: description.trim() || null,
    };
    try {
      const res =
        mode === 'create'
          ? await fetch('/api/items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...fields, areaId, photos }),
            })
          : await fetch(`/api/items/${item!.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fields),
            });
      if (!res.ok) throw new Error(String(res.status));
      const id = mode === 'create' ? ((await res.json()) as { id: number }).id : item!.id;
      if (mode === 'create' && areaId !== null) rememberRecent(householdId, areaId);

      if (another) {
        toast(t('add.itemSaved', { name: fields.name }));
        // Keep the place; clear the rest for the next item.
        setName('');
        setPhotos([]);
        setQuantity(1);
        setDims(EMPTY_DIMS);
        setItemTags([]);
        setDescription('');
        setFormKey((k) => k + 1);
        nameRef.current?.focus();
        window.scrollTo({ top: 0 });
      } else {
        toast(mode === 'create' ? t('add.itemSaved', { name: fields.name }) : t('common.saved'));
        router.replace(`/items/${id}`);
        router.refresh();
      }
    } catch {
      setError(t('common.error'));
    }
    setSaving(false);
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      {error && <Alert>{error}</Alert>}

      {mode === 'create' && <PendingPhotos value={photos} onChange={setPhotos} />}

      <Field label={t('form.name')}>
        <TextInput
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.itemNamePlaceholder')}
          maxLength={120}
          autoFocus={mode === 'create'}
          enterKeyHint="done"
        />
      </Field>

      {mode === 'create' && (
        <LocationField
          label={t('form.location')}
          areas={areas}
          onAreasChange={setAreas}
          householdId={householdId}
          value={areaId}
          onChange={setAreaId}
          noneLabel={t('picker.none')}
          placeholder={t('form.chooseLocation')}
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
          <Field label={t('form.quantity')}>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" className="w-12 px-0 text-xl" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="−1">
                −
              </Button>
              <TextInput
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(1_000_000, parseInt(e.target.value, 10) || 1)))}
                inputMode="numeric"
                className="!w-20 text-center"
              />
              <Button type="button" variant="secondary" className="w-12 px-0 text-xl" onClick={() => setQuantity((q) => q + 1)} aria-label="+1">
                +
              </Button>
            </div>
          </Field>
          <DimsInput key={formKey} initial={item ? pickDims(item) : EMPTY_DIMS} onChange={setDims} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t('item.tags')}</span>
            <TagInput allTags={tags} value={itemTags} onChange={setItemTags} />
          </div>
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

      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {t('common.save')}
        </Button>
        {mode === 'create' && (
          <Button type="button" variant="secondary" disabled={saving} onClick={() => save(true)}>
            {t('add.saveAndAnother')}
          </Button>
        )}
      </div>
    </form>
  );
}
