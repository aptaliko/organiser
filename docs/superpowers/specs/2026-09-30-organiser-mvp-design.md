# Organiser — MVP design

Status: approved in brainstorming, 2026-09-30.

## Goal

A super user-friendly app to know **where my stuff is** — around the house or in other
storage spaces (warehouse, parents' house, basement). The core loop is: *search an item →
see "Warehouse → Room 2 → Blue box" plus a photo of that box*.

## Decisions

| Topic | Decision |
|---|---|
| Users | Accounts; data belongs to a **household** that several users share |
| Sharing | Household = one shared space; every member sees/edits everything. Invite by email link. A user can belong to several households (switcher) |
| Login | Email + password, homegrown signed-cookie auth (same pattern as glentify `src/lib/auth.ts`) |
| Platform | Mobile-first web app, installable as a **PWA**; camera via `<input type="file" accept="image/*" capture>`. No native build, no offline writes in v1 |
| Hosting | Vercel (`*.vercel.app`), Neon Postgres, Vercel Blob for photos |
| Stack | Next.js 16 (App Router) + Tailwind + Drizzle (`neon-http`), zod, vitest |
| Language | English + Greek, per-user setting, small typed dictionary |
| Units | Stored as integer **cm**; displayed as cm, or m / m³ for large values |
| Free space | Volume-based + "does it fit" rotation check (no 3D packing) |
| Extras in v1 | Item photos, item quantity, QR labels for areas, tags on items |

## Data model

All household-scoped tables carry `householdId NOT NULL`; every query filters by the
current user's active household. An id outside it returns **404** (never 403).

- **users** — `id, email (unique, lowercased), passwordHash, name, locale ('en'|'el'), activeHouseholdId`
- **households** — `id, name, createdAt`
- **householdMembers** — `householdId, userId, role ('owner'|'member')`, PK on the pair
- **householdInvites** — `id, householdId, tokenHash, email?, expiresAt, usedAt?`
- **areas** — `id, householdId, parentId? (→ areas, ON DELETE RESTRICT), name (required),
  description?, widthCm?, depthCm?, heightCm?, address?, qrCode (short unique slug), createdAt, updatedAt`
  - `address` is only editable on top-level areas; children display the nearest ancestor's.
  - An area can't be its own ancestor (checked on create/move, see *Moving*).
- **items** — `id, householdId, areaId? (→ areas, ON DELETE SET NULL is NOT used — see delete rules),
  name (required), description?, widthCm?, depthCm?, heightCm?, quantity (int ≥ 1, default 1), createdAt, updatedAt`
  - `areaId = NULL` = "Unplaced".
- **photos** — `id, householdId, areaId? | itemId? (exactly one set), url, width, height, sortOrder`.
  First by `sortOrder` is the cover. Images are resized client-side (~1600px long edge, JPEG)
  before upload to Vercel Blob.
- **tags** — `id, householdId, name, color`, unique `(householdId, lower(name))`
- **itemTags** — `itemId, tagId`

Delete rules: deleting an area that still contains items or sub-areas asks the user what
to do — *move contents to the parent area* (default) or *delete everything*. Items are
never silently orphaned.

## Search (home screen)

- One large search box; results as you type (debounced), grouped **Items / Areas / Tags**.
- Accent- and case-insensitive (Postgres `unaccent` + `lower`), typo-tolerant with `pg_trgm`
  similarity, so `κατσαβιδι` finds `Κατσαβίδι`. Also matches description and tag names.
- Item result: name, `×qty`, **breadcrumb path** `Warehouse → Room 2 → Blue box`
  (recursive CTE over `areas.parentId`), thumbnail = item cover photo, else the photo of the
  **nearest area on the path** that has one. Unplaced items show "Unplaced".
- Every breadcrumb segment is tappable.

## Free space & "does it fit"

Pure functions in `src/lib/space.ts`, fully unit-tested.

- `areaVolume = w × d × h` (only if all three set; otherwise no calculation, UI prompts to add dimensions).
- `used = Σ(item volume × quantity)` for items **directly** in the area
  `+ Σ(outer volume of direct child areas)`. A child box's contents are *not* counted again —
  the box already occupies that space.
- Items/child areas without dimensions are counted in an `unknownCount`, shown as
  "3 items without dimensions — estimate may be low".
- Area page shows a fill bar: "62% full · ~0.4 m³ free". Over 100% is shown, not clamped.
- `fits(item, area)`: sort both dimension triples and compare element-wise (any rotation),
  **and** `item volume × qty ≤ free volume`. Returns a reason when it doesn't fit
  (`too-long` / `not-enough-space` / `unknown-dimensions`).
- **Find a place**: on an item page, list every area where it fits, emptiest first.

## Moving

Moving is a first-class action, reachable from everywhere an item or area is shown.

- **Move an item**: "Move" button on the item page and swipe/long-press on any list row →
  location picker → done. Toast with **Undo**.
- **Move part of a quantity**: for items with `quantity > 1`, the move sheet asks
  "How many?" (default: all). Moving some splits the item into a new row in the target area
  (copies name, description, dimensions, tags, photo references); if an item with the same
  name already exists in the target, offer to merge quantities instead.
- **Bulk move**: "Select" mode on any area/search list → pick several items (and/or sub-areas)
  → "Move N to…". The "I reorganised the shelf" case.
- **Move an area** (e.g. a box to another room): changes its `parentId`; its whole subtree
  moves with it. The picker disables the area itself and its descendants (no cycles);
  server re-validates.
- **Unplace**: "Take out" sets `areaId = NULL` (item lent out, in use, etc.).
- **Fit warning**: when the target has dimensions, the picker shows each candidate's free
  space and a ⚠ "may not fit" hint using `fits()`. It warns, never blocks.
- **Move from a QR scan**: on an area page opened via QR, "Move items here" opens search to
  pull items into this box — natural when physically packing.
- **Location picker** (shared by add/move): recent locations first, then search, then tree
  browse; "+ New area here" inline.
- Last-moved info (`updatedAt`, "moved 3 days ago") shown on the item page. Full move
  history is out of scope for v1.

## QR labels

- Each area gets a short `qrCode` slug; `/a/{qrCode}` redirects to the area page
  (login required; members of other households get 404).
- "Print labels" page: select areas → printable sheet (print CSS) with QR + area name + path.
- Scanning with the phone's normal camera opens the area: contents, photo, free space,
  "Add item here", "Move items here".

## UX / navigation

- Bottom nav: **Search** (home) · **Places** (area tree) · **＋ Add** · **Settings**.
- **Quick add item**: photo → name → place (defaults to the last-used place). Dimensions,
  quantity, tags, description are behind "More details".
- **Area page**: cover photo(s), breadcrumb, address (inherited), fill bar, sub-areas, items,
  actions: Move · Edit · Print label · Add item here.
- **Places**: collapsible tree with item counts per area; "Unplaced" pseudo-area at the top
  when non-empty.
- **Settings**: household name, members, invite link, household switcher, language, logout.
- Large tap targets, works one-handed; empty states explain the next step.

## Testing

Vitest for pure logic: `space.ts` (volume, used, fits, find-a-place ranking), breadcrumb
building, cycle detection for area moves, quantity split/merge, auth token sign/verify,
password hashing, i18n dictionary completeness (every `en` key exists in `el`).
API routes and camera/upload are verified manually.

## Out of scope for v1

3D bin packing · native apps / offline editing · product barcode lookup · move/audit
history · per-area sharing permissions · tags on areas.
