// Request-body validation shared by the API routes (and usable by forms).
import { z } from 'zod';

const MAX_CM = 100_000; // 1 km — anything bigger is a typo

export const dimSchema = z.number().int().positive().max(MAX_CM).nullable();
export const nameSchema = z.string().trim().min(1).max(120);
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((s) => (s ? s : null));

export const photoInputSchema = z.object({
  url: z
    .string()
    .max(2000)
    .refine((u) => isAllowedPhotoUrl(u), 'photo url must come from our upload'),
  width: z.number().int().positive().max(20_000).nullable(),
  height: z.number().int().positive().max(20_000).nullable(),
});
export type PhotoInput = z.infer<typeof photoInputSchema>;

/** Vercel Blob public URLs, or (local dev without a Blob token) our own local store. */
export function isAllowedPhotoUrl(url: string): boolean {
  if (url.startsWith('/api/photos/local/')) return /^\/api\/photos\/local\/[\w.-]+$/.test(url);
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

const dimsShape = { widthCm: dimSchema, depthCm: dimSchema, heightCm: dimSchema };

export const areaCreateSchema = z.object({
  name: nameSchema,
  parentId: z.number().int().positive().nullable().default(null),
  description: optionalText(2000).default(null),
  address: optionalText(500).default(null),
  widthCm: dimSchema.default(null),
  depthCm: dimSchema.default(null),
  heightCm: dimSchema.default(null),
  photos: z.array(photoInputSchema).max(10).default([]),
});
export type AreaCreateInput = z.infer<typeof areaCreateSchema>;

export const areaUpdateSchema = z
  .object({
    name: nameSchema,
    description: optionalText(2000),
    address: optionalText(500),
    ...dimsShape,
  })
  .partial();
export type AreaUpdateInput = z.infer<typeof areaUpdateSchema>;

export const itemCreateSchema = z.object({
  name: nameSchema,
  areaId: z.number().int().positive().nullable().default(null),
  description: optionalText(2000).default(null),
  quantity: z.number().int().min(1).max(1_000_000).default(1),
  widthCm: dimSchema.default(null),
  depthCm: dimSchema.default(null),
  heightCm: dimSchema.default(null),
  tagIds: z.array(z.number().int().positive()).max(50).default([]),
  photos: z.array(photoInputSchema).max(10).default([]),
});
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;

export const itemUpdateSchema = z
  .object({
    name: nameSchema,
    description: optionalText(2000),
    quantity: z.number().int().min(1).max(1_000_000),
    ...dimsShape,
    tagIds: z.array(z.number().int().positive()).max(50),
  })
  .partial();
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;

export const tagCreateSchema = z.object({ name: z.string().trim().min(1).max(60) });
export const tagUpdateSchema = z
  .object({ name: z.string().trim().min(1).max(60), color: z.string().regex(/^#[0-9a-f]{6}$/i) })
  .partial();

export const moveSchema = z
  .object({
    items: z
      .array(z.object({ id: z.number().int().positive(), quantity: z.number().int().positive().optional() }))
      .max(500)
      .default([]),
    areas: z.array(z.number().int().positive()).max(500).default([]),
    targetAreaId: z.number().int().positive().nullable(),
    /** Unset: answer 409 merge_possible when a same-named item is already in the target. */
    mergeSameName: z.boolean().optional(),
  })
  .refine((b) => b.items.length + b.areas.length > 0, 'nothing to move');
export type MoveBody = z.input<typeof moveSchema>;
