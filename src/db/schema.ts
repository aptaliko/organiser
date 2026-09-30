import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

export const households = pgTable('households', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  createdAt: createdAt(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 254 }).notNull().unique(), // always stored lowercased
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  locale: varchar('locale', { length: 2 }).notNull().default('en'), // 'en' | 'el'
  // Which household the app shows. Verified against household_members on every request
  // (src/lib/household.ts), so a stale value can't leak another household's data.
  activeHouseholdId: integer('active_household_id').references(() => households.id, {
    onDelete: 'set null',
  }),
  createdAt: createdAt(),
});

export const householdMembers = pgTable(
  'household_members',
  {
    householdId: integer('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 10 }).notNull().default('member'), // 'owner' | 'member'
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.userId] }), index('household_members_user_idx').on(t.userId)],
);

export const householdInvites = pgTable('household_invites', {
  id: serial('id').primaryKey(),
  householdId: integer('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(), // sha256 hex of the raw token
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: createdAt(),
});

// Dimension columns shared by areas and items: integer centimetres, nullable, > 0.
const dims = {
  widthCm: integer('width_cm'),
  depthCm: integer('depth_cm'),
  heightCm: integer('height_cm'),
};
const dimChecks = (name: string, t: { widthCm: AnyPgColumn; depthCm: AnyPgColumn; heightCm: AnyPgColumn }) => [
  check(`${name}_width_positive`, sql`${t.widthCm} IS NULL OR ${t.widthCm} > 0`),
  check(`${name}_depth_positive`, sql`${t.depthCm} IS NULL OR ${t.depthCm} > 0`),
  check(`${name}_height_positive`, sql`${t.heightCm} IS NULL OR ${t.heightCm} > 0`),
];

export const areas = pgTable(
  'areas',
  {
    id: serial('id').primaryKey(),
    householdId: integer('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    // RESTRICT: deleting a non-empty area is an explicit user choice (move contents up or
    // delete everything), handled in the API — never a silent cascade.
    parentId: integer('parent_id').references((): AnyPgColumn => areas.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    ...dims,
    address: text('address'), // only set on top-level areas; children inherit for display
    qrCode: varchar('qr_code', { length: 12 }).notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('areas_household_parent_idx').on(t.householdId, t.parentId), ...dimChecks('areas', t)],
);

export const items = pgTable(
  'items',
  {
    id: serial('id').primaryKey(),
    householdId: integer('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    areaId: integer('area_id').references(() => areas.id, { onDelete: 'restrict' }), // null = Unplaced
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    ...dims,
    quantity: integer('quantity').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('items_household_area_idx').on(t.householdId, t.areaId),
    check('items_quantity_positive', sql`${t.quantity} >= 1`),
    ...dimChecks('items', t),
  ],
);

export const photos = pgTable(
  'photos',
  {
    id: serial('id').primaryKey(),
    householdId: integer('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    areaId: integer('area_id').references(() => areas.id, { onDelete: 'cascade' }),
    itemId: integer('item_id').references(() => items.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    width: integer('width'),
    height: integer('height'),
    sortOrder: integer('sort_order').notNull().default(0), // lowest = cover
    createdAt: createdAt(),
  },
  (t) => [
    index('photos_area_idx').on(t.areaId),
    index('photos_item_idx').on(t.itemId),
    check('photos_exactly_one_owner', sql`(${t.areaId} IS NULL) <> (${t.itemId} IS NULL)`),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),
    householdId: integer('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 60 }).notNull(),
    color: varchar('color', { length: 16 }).notNull(),
  },
  (t) => [uniqueIndex('tags_household_name_idx').on(t.householdId, sql`lower(${t.name})`)],
);

export const itemTags = pgTable(
  'item_tags',
  {
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.tagId] }), index('item_tags_tag_idx').on(t.tagId)],
);

export type User = typeof users.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Area = typeof areas.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Tag = typeof tags.$inferSelect;
