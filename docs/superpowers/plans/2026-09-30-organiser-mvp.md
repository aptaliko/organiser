# Organiser MVP Implementation Plan

> **For agentic workers:** execute task-by-task, in order. Steps use checkbox (`- [ ]`)
> syntax for tracking. Each task ends green (`npm run lint && npm run typecheck && npm test`)
> and with its own commit.

**Goal:** Ship the MVP described in the spec: a mobile-first, installable web app on
Vercel where a household tracks storage areas (nested, with photos, dimensions, QR labels)
and items (photos, quantity, tags), searches "where is X?", moves things around, and sees
free space per area.

**Architecture:** One Next.js 16 App Router app. Server Components read the DB directly
for pages; mutations go through small JSON API routes under `src/app/api` validated with
zod. Postgres (Neon) via `drizzle-orm/neon-http`; photos in Vercel Blob via client upload.
All business rules that can be pure (space math, tree/breadcrumb/cycle logic, quantity
split/merge, unit formatting, auth tokens) live in `src/lib/*.ts` with vitest tests.
No native build, no offline writes.

**Tech stack:** Next.js 16.3 · React 19 · TypeScript · Tailwind 4 · Drizzle ORM + drizzle-kit ·
`@neondatabase/serverless` · `@vercel/blob` · zod · `qrcode` · vitest · eslint.

**Spec:** `docs/superpowers/specs/2026-09-30-organiser-mvp-design.md`

## Global constraints

- **Read `node_modules/next/dist/docs/` before writing Next code** — this Next version
  differs from training data (e.g. `src/proxy.ts`, not `middleware.ts`; async `params`).
- **Household scoping is the security boundary.** Every query on `areas`, `items`,
  `photos`, `tags`, `itemTags` takes a `householdId` and filters on it. Handlers get it only
  from `requireHousehold(request)` (Task 3), never from the request body. An id outside the
  household → **404**.
- **neon-http has no interactive transactions.** Multi-statement writes (quantity split,
  area delete-with-move, register-creates-household) use `db.batch([...])`, which runs
  atomically. Don't write `db.transaction(async tx => …)`.
- **Dimensions are integer cm, nullable, > 0.** Quantity is an integer ≥ 1.
- **Every UI string goes through `t()`** (Task 4); the completeness test fails on a
  missing `el` key.
- Mobile-first: design at 375px wide, tap targets ≥ 44px, bottom nav always reachable.
- Reuse glentify patterns where noted (auth token, password hash, blob upload, local
  Docker stack) — copy and adapt, don't import across repos.

---

### Task 0: Scaffold the project

**Files:** whole repo root.

- [ ] `npx create-next-app@16.3.4 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm` (in the empty repo; keep the existing `docs/`).
- [ ] Add deps: `drizzle-orm @neondatabase/serverless @vercel/blob zod qrcode`;
      dev: `drizzle-kit vitest tsx dotenv-cli @types/qrcode`.
- [ ] `package.json` scripts, mirroring glentify:
      `test: vitest run`, `typecheck: tsc --noEmit`, `db:generate: drizzle-kit generate`,
      `db:migrate: dotenv -e .env.local -- tsx scripts/migrate.ts`,
      `db:seed:dev: dotenv -e .env.local -- tsx scripts/seed-dev.ts`,
      `dev:up: bash scripts/dev-up.sh`, `dev:down: docker compose down`.
- [ ] `vitest.config.ts` with the `@` alias and `environment: 'node'`.
- [ ] Copy from glentify and rename `glentify`→`organiser`: `docker-compose.yml`
      (postgres + neon-http proxy), `src/db/neonConfig.ts`, `scripts/migrate.ts`,
      and a trimmed `scripts/dev-up.sh` (down → up → migrate → seed-dev; `--reset` wipes the volume).
- [ ] `.env.example`: `DATABASE_URL`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `NEON_LOCAL`, `APP_URL`.
- [ ] `src/lib/sanity.test.ts` (`expect(1).toBe(1)`) so `npm test` passes.
- [ ] `CLAUDE.md` (commands, architecture summary, the global constraints above) — `@AGENTS.md` at top.
- [ ] Commit: "Scaffold Next.js app".

### Task 1: Database schema

**Files:** `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`, `drizzle/0000_*.sql`, `drizzle/0001_search.sql` (custom).

- [ ] `src/db/client.ts`: `import './neonConfig'; export const db = drizzle(neon(process.env.DATABASE_URL!), { schema });`
- [ ] Tables per the spec's data model (`serial` ids, `timestamp with time zone` defaults `now()`):
  - `users(id, email unique, passwordHash, name, locale default 'en', activeHouseholdId → households nullable, createdAt)`
  - `households(id, name, createdAt)`
  - `householdMembers(householdId → households cascade, userId → users cascade, role, createdAt)`, PK `(householdId, userId)`
  - `householdInvites(id, householdId cascade, tokenHash unique, createdBy → users, expiresAt, usedAt)`
  - `areas(id, householdId cascade, parentId → areas RESTRICT, name, description, widthCm, depthCm, heightCm, address, qrCode unique, createdAt, updatedAt)`; index `(householdId, parentId)`
  - `items(id, householdId cascade, areaId → areas RESTRICT, name, description, widthCm, depthCm, heightCm, quantity default 1, createdAt, updatedAt)`; index `(householdId, areaId)`
  - `photos(id, householdId cascade, areaId → areas cascade, itemId → items cascade, url, width, height, sortOrder default 0, createdAt)`; `CHECK ((area_id IS NULL) <> (item_id IS NULL))`
  - `tags(id, householdId cascade, name, color)`; unique index on `(household_id, lower(name))`
  - `itemTags(itemId cascade, tagId cascade)`, PK on the pair
  - CHECKs: dimensions `> 0` when not null, `quantity >= 1`.
- [ ] `npm run db:generate` → `0000`.
- [ ] Custom migration `drizzle-kit generate --custom --name search`:
  ```sql
  CREATE EXTENSION IF NOT EXISTS unaccent;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  -- unaccent() is STABLE; an IMMUTABLE wrapper is required to index it.
  CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    AS $$ SELECT public.unaccent('public.unaccent', $1) $$;
  CREATE INDEX items_name_trgm ON items USING gin (f_unaccent(lower(name)) gin_trgm_ops);
  CREATE INDEX areas_name_trgm ON areas USING gin (f_unaccent(lower(name)) gin_trgm_ops);
  ```
  Verify locally that `f_unaccent(lower('Κατσαβίδι')) = 'κατσαβιδι'` (Greek tonos is removed by the default `unaccent` rules; if not, add a `translate()` fallback for `άέήίόύώϊΐϋΰ` inside `f_unaccent`).
- [ ] `npm run dev:up` applies both migrations cleanly on an empty DB.
- [ ] Commit.

### Task 2: Auth (email + password)

**Files:** `src/lib/passwordHash.ts(+test)`, `src/lib/auth.ts(+test)`, `src/proxy.ts`,
`src/lib/requestUser.ts`, `src/db/queries/users.ts`, `src/app/api/{register,login,logout}/route.ts`,
`src/app/(auth)/{login,register}/page.tsx`.

- [ ] Copy glentify `passwordHash.ts` (scrypt) and its test verbatim.
- [ ] Copy glentify `auth.ts` with cookie name `organiser_auth`; same `userId.expiresAt.hmac`
      token, 30-day TTL. Tests: round-trip, tampered signature → null, expired → null, malformed → null.
- [ ] `src/proxy.ts`: public paths `/login`, `/register`, `/invite/*`, `/api/login`,
      `/api/register`, static assets, `/manifest.webmanifest`, icons. Otherwise verify cookie →
      set `x-user-id` request header; pages redirect to `/login?next=…`, `/api/*` return 401.
      (No Bearer/CORS — web only.)
- [ ] `getUserId(request)` in `requestUser.ts` (throws if header missing) + a server-component
      helper `currentUserId()` reading `headers()`.
- [ ] `POST /api/register {name, email, password(min 8)}`: lowercase email; 409 on duplicate;
      `db.batch` → insert user, insert household "`{name}`'s home" / "Σπίτι του `{name}`"
      by locale, insert owner membership, set `activeHouseholdId`. Set cookie.
      (Insert ids are needed across statements: insert household first with `returning`,
      then batch user+membership, or use a CTE via `sql` — pick one and keep it atomic.)
      If `?invite=token` is present, join that household instead of creating one (Task 17 wires the UI).
- [ ] `POST /api/login` (generic "wrong email or password"), `POST /api/logout` (clear cookie).
- [ ] Login/register pages: single column, big inputs, `autocomplete` attributes, show/hide password.
- [ ] Commit.

### Task 3: Household context & scoping helpers

**Files:** `src/lib/household.ts`, `src/db/queries/households.ts`, `src/lib/http.ts`.

- [ ] `requireHousehold(request)` → `{ userId, householdId }`: reads the user's
      `activeHouseholdId`, verifies membership (falls back to their first membership and
      repairs `activeHouseholdId` if stale); throws `NotFound` if none.
      Server-component twin `currentHousehold()`.
- [ ] `src/lib/http.ts`: `notFound()`, `badRequest(zodError)`, `json(data)`, and
      `withErrors(handler)` wrapper that maps thrown `NotFound`/`ZodError` to 404/400.
- [ ] Commit.

### Task 4: i18n (English + Greek)

**Files:** `src/i18n/en.ts`, `src/i18n/el.ts`, `src/i18n/index.ts`, `src/i18n/i18n.test.ts`, `src/i18n/I18nProvider.tsx`.

- [ ] `en.ts` exports a flat `as const` object of keys → strings (with `{name}` placeholders);
      `el.ts` is typed `Record<keyof typeof en, string>` so a missing key is a **type error**.
- [ ] `t(dict, key, vars?)` pure interpolation; `getDict(locale)`.
- [ ] Server: `getT()` reads the current user's `locale`. Client: `I18nProvider` + `useT()`.
- [ ] Test: every key in `en` exists and is non-empty in `el`; placeholders match between the two.
- [ ] Language switch lives in Settings (Task 17); `PATCH /api/me {locale}`.
- [ ] Commit.

### Task 5: Units formatting

**Files:** `src/lib/units.ts(+test)`.

- [ ] `formatLength(cm)`: `< 100` → `"45 cm"`; else `"2.4 m"` (1 decimal, trim `.0`).
- [ ] `formatDims({w,d,h})`: `"40 × 30 × 25 cm"`; `"2.4 × 3 × 2.6 m"` when any ≥ 100; `null` when none set.
- [ ] `formatVolume(cm3)`: `< 1000` → `cm³`; `< 1 000 000` → `"12.5 L"`; else `"0.4 m³"` (2 significant decimals).
- [ ] `parseLength(input)`: accepts `"45"`, `"45cm"`, `"1.2m"`, `"1,2 m"` (Greek decimal comma) → integer cm or `null`.
- [ ] Tests for each branch including comma decimals and rounding.
- [ ] Commit.

### Task 6: Area tree logic + areas CRUD

**Files:** `src/lib/areaTree.ts(+test)`, `src/db/queries/areas.ts`, `src/lib/qrCode.ts(+test)`,
`src/app/api/areas/route.ts`, `src/app/api/areas/[id]/route.ts`.

- [ ] `areaTree.ts` (pure; input is the household's flat `{id, parentId, name, address}[]`):
  - `buildTree(areas)` → nested nodes sorted by name (locale-aware `localeCompare(…, 'el')`).
  - `pathTo(areas, id)` → ancestors root→self (guards against cycles with a visited set).
  - `descendantIds(areas, id)` → Set including `id`.
  - `wouldCreateCycle(areas, id, newParentId)` → `newParentId !== null && descendantIds(areas, id).has(newParentId)`.
  - `effectiveAddress(areas, id)` → nearest non-empty address walking up.
  - Tests: nesting, orphan-safe path, self-parent, grandchild-parent, move to root.
- [ ] `qrCode.ts`: `generateQrCode()` → 6 chars from an unambiguous alphabet (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`) using `crypto.randomInt`; insert retries on unique violation (max 5).
- [ ] Queries: `listAreas(hh)` (flat, cheap — one household is small), `getArea(hh, id)`,
      `createArea(hh, input)`, `updateArea(hh, id, patch)`.
- [ ] API: `GET/POST /api/areas`, `GET/PATCH /api/areas/[id]`. zod schema: name 1–120 chars
      trimmed, dims optional positive ints, `address` rejected (400) when `parentId` is not null,
      `parentId` must belong to the household (else 404). Parent changes go through the move
      endpoint (Task 14), not PATCH.
- [ ] Commit.

### Task 7: Items CRUD

**Files:** `src/db/queries/items.ts`, `src/app/api/items/route.ts`, `src/app/api/items/[id]/route.ts`.

- [ ] Queries: `getItem(hh, id)` (with tags + photos), `listItemsInArea(hh, areaId | null)`,
      `createItem(hh, input)`, `updateItem(hh, id, patch)`, `deleteItem(hh, id)`.
- [ ] API: `POST /api/items`, `GET/PATCH/DELETE /api/items/[id]`. zod: name required,
      quantity int ≥ 1, dims optional, `areaId` nullable and household-checked, `tagIds[]` household-checked.
      Location changes go through the move endpoint.
- [ ] Commit.

### Task 8: Photos

**Files:** `src/lib/imageResize.ts`, `src/app/api/photos/upload/route.ts`,
`src/app/api/photos/route.ts`, `src/app/api/photos/[id]/route.ts`, `src/components/PhotoPicker.tsx`.

- [ ] `imageResize.ts` (client): `resizeImage(file, maxEdge=1600, quality=0.82)` via
      `createImageBitmap` (honours EXIF orientation) + `OffscreenCanvas`/canvas → JPEG `Blob` + `{width,height}`.
      Pure helper `fitWithin(w,h,maxEdge)` extracted and unit-tested.
- [ ] Upload route: copy glentify `api/songs/image-upload` (`handleUpload`, jpeg/png/webp, 10 MB,
      `addRandomSuffix`); prefix pathname with `h{householdId}/` from `requireHousehold`.
- [ ] `POST /api/photos {areaId|itemId, url, width, height}` (checks ownership; url must be on the
      Blob host), `DELETE /api/photos/[id]` (also `del(url)` from Blob), `PATCH` for `sortOrder` (set cover).
- [ ] `PhotoPicker`: two buttons — "Take photo" (`capture="environment"`) and "Choose from gallery";
      thumbnail strip; uploading spinner; tap thumbnail → set as cover / delete.
- [ ] Commit.

### Task 9: Tags

**Files:** `src/db/queries/tags.ts`, `src/app/api/tags/route.ts`, `src/app/api/tags/[id]/route.ts`, `src/components/TagInput.tsx`.

- [ ] CRUD; creating a tag with an existing name (case/accent-insensitive) returns the existing one.
- [ ] `TagInput`: chips + type-ahead; "Create “foo”" row when no match; colour from a fixed 8-colour palette, auto-assigned round-robin.
- [ ] Commit.

### Task 10: App shell & PWA

**Files:** `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/components/BottomNav.tsx`,
`src/app/manifest.ts`, `public/icons/*`, `src/components/Toast.tsx`.

- [ ] `(app)` route group layout: header with household name, content, fixed `BottomNav`
      (Search `/`, Places `/places`, Add `/add`, Settings `/settings`), safe-area insets.
- [ ] `manifest.ts`: name "Organiser", `display: 'standalone'`, `start_url: '/'`, theme colour,
      192/512 + maskable icons. `viewport` export with `themeColor`.
- [ ] `Toast` provider with an optional action button (used for **Undo** in Task 14).
- [ ] Verify Chrome Android offers "Install app" (manual).
- [ ] Commit.

### Task 11: Location picker

**Files:** `src/components/LocationPicker.tsx`, `src/lib/recentLocations.ts(+test)`.

- [ ] `recentLocations.ts`: pure `pushRecent(list, id, max=5)` (dedupe, most-recent first) + tested;
      thin localStorage wrapper keyed by household (try/catch).
- [ ] Bottom-sheet picker: **Recent** → search box (client-side filter over `listAreas`, accent-insensitive
      via `normalize('NFD').replace(/\p{Diacritic}/gu,'')`) → tree browse with breadcrumbs →
      "＋ New area here" inline (name only, then continues). Each row shows path + free space
      badge (Task 13). Props: `disabledIds` (for area moves), `itemForFit?` (fit hints), `allowNone` ("Unplaced").
- [ ] Commit.

### Task 12: Pages — Places, area, item, add

**Files:** `src/app/(app)/places/page.tsx`, `src/app/(app)/areas/[id]/page.tsx`,
`src/app/(app)/areas/[id]/edit/page.tsx`, `src/app/(app)/items/[id]/page.tsx`,
`src/app/(app)/items/[id]/edit/page.tsx`, `src/app/(app)/add/page.tsx`, `src/components/Breadcrumb.tsx`.

- [ ] **Places**: collapsible tree (`buildTree`) with recursive item counts; "Unplaced (n)" on top when n > 0;
      empty state "Add your first place — e.g. *Home*, *Warehouse*".
- [ ] **Area page**: cover photo carousel, `Breadcrumb`, effective address (tap → Google Maps link),
      fill bar (Task 13), sub-areas, items (name, ×qty, thumb), actions: Add item here · Add sub-area ·
      Move · Edit · Print label · Delete.
- [ ] **Item page**: photos, breadcrumb (or "Unplaced"), qty, dims, tags, description, "moved 3 days ago"
      (`Intl.RelativeTimeFormat`), actions: Move · Take out · Edit · Find a place · Delete.
- [ ] **Add**: two big choices (Item / Place). Item quick-add: PhotoPicker → name → place (default =
      most recent) → Save; "More details" disclosure for qty, dims (`parseLength` inputs), tags, description.
      Place: name, parent (picker, optional), photo; details: dims, address (only when no parent), description.
      "Save & add another" keeps the chosen place.
- [ ] Edit pages reuse the same form components.
- [ ] Commit.

### Task 13: Free space

**Files:** `src/lib/space.ts(+test)`, `src/components/FillBar.tsx`, `src/app/api/items/[id]/places/route.ts`.

- [ ] `space.ts` (pure):
  ```ts
  type Dims = { widthCm: number | null; depthCm: number | null; heightCm: number | null };
  volume(d: Dims): number | null                       // null unless all three set
  areaUsage(area: Dims, items: (Dims & {quantity:number})[], children: Dims[])
    → { capacity: number | null; used: number; free: number | null; percent: number | null; unknownCount: number }
  fits(item: Dims & {quantity:number}, usage, area: Dims)
    → { ok: true } | { ok: false; reason: 'unknown-dimensions' | 'too-long' | 'not-enough-space' }
  rankPlaces(item, candidates: {id, area: Dims, usage}[]) → ids that fit, by free volume desc
  ```
  `fits`: sort both triples descending, compare element-wise (one item's footprint; quantity
  only affects volume); `unknown-dimensions` if either side lacks dims. `percent` is not clamped.
- [ ] Tests: no dims → capacity null; child area counts by outer volume and its contents don't;
      unknownCount; rotation fits (100×10×10 into 10×100×10); too-long; quantity pushes over free;
      over 100%; ranking order.
- [ ] `FillBar`: green < 70%, amber < 95%, red ≥ 95%; label "62% full · ~0.4 m³ free"; below it
      "3 items without dimensions — estimate may be low"; no-dims state "Add dimensions to see free space".
- [ ] `GET /api/items/[id]/places` → `rankPlaces` over all household areas (one query for areas,
      one aggregate for direct item volumes, compute in memory). Item page "Find a place" lists results
      with a "Move here" button.
- [ ] Commit.

### Task 14: Moving

**Files:** `src/lib/moveItems.ts(+test)`, `src/db/queries/moves.ts`, `src/app/api/move/route.ts`,
`src/components/MoveSheet.tsx`, `src/components/SelectMode.tsx`.

- [ ] `moveItems.ts` (pure planner): input = the items being moved (with requested qty), target
      area's existing items; output = a list of operations:
      `{kind:'relocate', itemId}` (whole qty), `{kind:'split', fromId, qty}` (partial → new row in target),
      `{kind:'merge', fromId, intoId, qty}` (same normalized name in target and user accepted merge →
      add qty, delete/decrement source). Tests for each + qty validation (1 ≤ qty ≤ quantity).
- [ ] `POST /api/move`:
  ```ts
  { items?: { id: number; quantity?: number }[]; areas?: number[];
    targetAreaId: number | null; mergeSameName?: boolean }
  ```
  Validates everything is in the household; for areas, loads `listAreas` and rejects (400
  `cycle`) if `wouldCreateCycle`; `targetAreaId: null` for areas = make top-level (clears
  nothing else; address stays). Executes all ops in **one `db.batch`**. Split copies name,
  description, dims and tags; photos are duplicated as new `photos` rows pointing at the same
  blob URL (so blob deletion must check no other row references the URL — update Task 8's DELETE).
  Returns an `undo` payload: the inverse moves (previous `areaId`/`parentId` per id; splits
  undone by merging back) so the client can POST it back.
- [ ] `MoveSheet`: opens `LocationPicker` with `itemForFit` (single item) and `disabledIds`
      (area subtree); qty stepper when quantity > 1 ("Move 4 of 12"); merge prompt if the planner
      reports a same-name item in the target. After success → toast "Moved to Blue box · Undo".
- [ ] Entry points: item page Move / Take out (target null); long-press on list rows opens
      `SelectMode` (checkboxes + sticky "Move N to…" bar) on area page, Places, search results;
      area page Move for the area itself; area page "Move items here" (search → multi-select → move into this area).
- [ ] Commit.

### Task 15: Search

**Files:** `src/db/queries/search.ts`, `src/app/api/search/route.ts`, `src/app/(app)/page.tsx`,
`src/components/SearchResults.tsx`.

- [ ] Query (`q` normalized as `f_unaccent(lower(q))`), household-scoped, three parts:
  - items matching name/description (`ILIKE '%q%'`) **or** `similarity(f_unaccent(lower(name)), q) > 0.3`,
    or having a matching tag; ranked: prefix match > substring > similarity; limit 30.
  - areas matching name; limit 10. Tags matching name; limit 10.
  - For item/area results, build breadcrumbs **in memory** from one `listAreas(hh)` call + `pathTo`
    (simpler than a recursive CTE and one extra cheap query). Thumbnail: item cover, else the
    nearest area on the path with a cover photo.
- [ ] `GET /api/search?q=` (min 1 char; empty → recent items).
- [ ] Home page: autofocus-free large search input (avoid popping the keyboard on open), debounced 200 ms,
      results grouped Items / Places / Tags; tag result → filtered item list. Empty state:
      "Where did I put…?" + recently updated items.
- [ ] Manual check with Greek data: `κατσαβιδι`, `ΚΑΤΣΑΒΙΔΙ`, `katsavidi` (no match — fine), typo `κατσαβδι`.
- [ ] Commit.

### Task 16: Delete area flow

**Files:** `src/app/api/areas/[id]/route.ts` (DELETE), `src/components/DeleteAreaDialog.tsx`.

- [ ] `DELETE /api/areas/[id]?contents=moveToParent|deleteAll`. If the area is non-empty and
      `contents` is missing → 409 with counts. `moveToParent` (default in UI): one `db.batch` that
      reparents children and items to the area's parent (null for top-level → items become Unplaced,
      children become top-level), then deletes the area. `deleteAll`: delete descendant items and
      areas bottom-up in one batch (ids from `descendantIds`), then blob cleanup for orphaned photo URLs.
- [ ] Dialog shows "Blue box has 4 items and 1 sub-area" with the two choices; typing nothing extra, but
      `deleteAll` button is red and secondary.
- [ ] Commit.

### Task 17: Households, invites, settings

**Files:** `src/app/(app)/settings/page.tsx`, `src/app/api/households/*`, `src/app/invite/[token]/page.tsx`, `src/lib/inviteToken.ts(+test)`.

- [ ] `inviteToken.ts`: random 32-byte token, stored as sha256 hash; 7-day expiry; tests for hash/verify/expiry.
- [ ] `POST /api/households/invites` (any member) → link `APP_URL/invite/{token}`; shown with
      "Copy" + `navigator.share` (WhatsApp/Viber friendly). Multi-use until expiry; owner can revoke.
- [ ] `/invite/[token]`: logged in → "Join *{household}*?" → join, switch to it. Logged out → register/login with `?invite=`.
- [ ] Settings: household name (rename), members list (owner can remove), invite, household switcher
      (+ "Create new household"), leave household (not if last owner), language EN/ΕΛ, logout.
- [ ] Commit.

### Task 18: QR labels

**Files:** `src/app/a/[code]/route.ts`, `src/app/(app)/labels/page.tsx`, `src/components/LabelSheet.tsx`.

- [ ] `/a/[code]`: look up by `qrCode` **within the user's households** (switch active household if the
      area belongs to another of theirs); redirect to `/areas/{id}`; else 404.
- [ ] Labels page: pick areas (tree with checkboxes; area page "Print label" pre-selects one);
      renders a grid of labels (QR via `qrcode.toString(url, {type:'svg'})` server-side, area name,
      short path, code in text). `@media print` A4 grid, 3 × 8 labels, "Print" button → `window.print()`.
- [ ] Manual: print one, scan with the stock camera app, lands on the box.
- [ ] Commit.

### Task 19: Seed data, docs, deploy

**Files:** `scripts/seed-dev.ts`, `README.md`, `docs/manual-testing-checklist.md`.

- [ ] `seed-dev.ts`: user `demo@local`/`demo1234`, household with Σπίτι → Αποθήκη → Ράφι 2 → Μπλε κουτί,
      Warehouse → Room 1; ~30 Greek/English items with dims, quantities, tags.
- [ ] `README.md`: setup, local dev, env vars, deploy.
- [ ] Manual checklist: camera upload on Android + iOS, PWA install, QR scan, Greek search, move/undo,
      split, delete area both modes, invite join, locale switch.
- [ ] Deploy (with the user — needs their accounts):
  1. Vercel → New Project → import `aptaliko/organiser`.
  2. Storage tab → add **Neon** Postgres (sets `DATABASE_URL`) and **Blob** store (sets `BLOB_READ_WRITE_TOKEN`).
  3. Env: `AUTH_SECRET` (`openssl rand -hex 32`), `APP_URL=https://<project>.vercel.app`.
  4. Run `npm run db:migrate` against the Neon URL (from a local `.env.local`), deploy, register, smoke-test.
- [ ] Commit.

---

## Suggested milestones

| Milestone | Tasks | You can… |
|---|---|---|
| M1 — skeleton | 0–5 | register, log in, switch language |
| M2 — core | 6–12 | create places & items with photos, browse |
| M3 — the point | 13–15 | see free space, move things, search "where is X" |
| M4 — polish & share | 16–19 | delete safely, invite family, print QR labels, live on vercel.app |
