# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this app is

Organiser: a mobile-first web app (installable PWA) for knowing where your stuff is. A
**household** (shared by its members) has nested **areas** (warehouse → room → shelf → box,
each with optional dimensions, photos, address on top-level ones, and a QR code) and
**items** (optional area — `NULL` = "Unplaced" —, dimensions, quantity, photos, tags).
Core loop: search an item → see `Warehouse → Room 2 → Blue box` plus a photo.

- Design spec: `docs/superpowers/specs/2026-09-30-organiser-mvp-design.md`
- Implementation plan (task-by-task, milestones M1–M4): `docs/superpowers/plans/2026-09-30-organiser-mvp.md`

## Commands

```bash
npm run dev            # Next.js dev server
npm run build          # production build
npm run lint           # eslint
npm run typecheck      # next typegen && tsc --noEmit
npm test               # vitest run (pure logic only)
npx vitest run src/lib/units.test.ts   # single file

npm run dev:up         # Docker Postgres + neon-http proxy, migrate, seed. `-- --reset` wipes data
npm run dev:down       # stop the local stack
npm run db:generate    # drizzle-kit generate — after editing src/db/schema.ts
npm run db:migrate     # apply migrations (uses .env.local); production builds on Vercel run
                       # them automatically first (scripts/migrate-on-deploy.ts, VERCEL_ENV=production only)
npm run db:seed:dev    # demo data (idempotent): demo@local / demo1234
```

Custom SQL migrations (extensions, functions, expression indexes drizzle-kit can't express):
`npx drizzle-kit generate --custom --name <name>` and hand-write the file. `0001_search.sql`
creates `unaccent` + `pg_trgm` and the IMMUTABLE `f_unaccent()` wrapper used by search
(`f_unaccent(lower('Κατσαβίδι')) = 'κατσαβιδι'`).

## Architecture

- **Stack**: Next.js 16 App Router (read `node_modules/next/dist/docs/` — e.g. `src/proxy.ts`,
  not `middleware.ts`; `params` are async; `LayoutProps`/`PageProps` are generated globals),
  Tailwind 4, Drizzle over `drizzle-orm/neon-http`, zod, vitest. Deployed on Vercel with Neon
  Postgres and Vercel Blob (photos).
- **neon-http has no interactive transactions.** A multi-statement write that must be atomic
  is either one SQL statement with data-modifying CTEs (see `createUserWithHousehold`) or
  `db.batch([...])`. Never `db.transaction(async tx => …)`.
- **Auth** (`src/lib/auth.ts`, copied from glentify): HMAC-signed `userId.expiresAt.sig`
  token in the httpOnly `organiser_auth` cookie, 30-day TTL. `src/proxy.ts` verifies it,
  strips any client-sent `x-user-id`, and injects the real one; unauthenticated pages redirect
  to `/login?next=…`, APIs get 401. Passwords: scrypt (`passwordHash.ts`).
- **Household scoping is the security boundary.** Every read/write of household data takes a
  `householdId` obtained only from `requireHousehold(request)` (API) / `currentHousehold()`
  (Server Components) in `src/lib/household.ts` — never from the request body.
  `users.activeHouseholdId` is just a preference, re-verified against `household_members`
  each request. Anything outside the household → **404, never 403**.
- **API routes** wrap handlers in `handle()` (`src/lib/http.ts`): throw `HttpError`
  (`notFound()`, `badRequest()`) or let a `ZodError` escape → JSON `{ error, details }`.
- **Queries**: `src/db/queries/*.ts`, one file per entity, plain functions using `db`.
  Areas are loaded **flat per household** (`listAreas`) and trees/breadcrumbs/cycle checks
  are computed in memory with `src/lib/areaTree.ts`.
- **Drizzle gotcha — correlated subqueries**: `${areas.id}` inside a `sql` template renders as
  a bare `"id"`, which inside a subquery binds to the *inner* table. Spell out the outer
  column (`"areas"."id"`), as in `listAreas`/`listItemsInArea`.
- **Arrays into raw SQL**: drizzle expands a JS array in `sql\`\`` into a param list, so pass
  arrays as JSON (`${JSON.stringify(ids)}::jsonb`) — see `createItem`/`createArea`, which
  insert the row, its tags and its photos in one atomic CTE statement.
- **Photos** (`src/lib/photoStorage.ts`, `src/lib/photoUpload.ts`): the browser resizes to
  ≤1600px JPEG, then uploads straight to Vercel Blob via a client token from
  `/api/photos/upload`. Without `BLOB_READ_WRITE_TOKEN` (local dev only — production throws)
  files go to `.local-uploads/` and are served by `/api/photos/local/[name]`. Photo rows
  point at URLs; a URL may be shared by several rows (split items), so storage is deleted only
  via `unreferencedUrls()`. Accepted URLs are whitelisted in `isAllowedPhotoUrl`.
- **Moves are not edits**: PATCH on areas/items never changes `parentId`/`areaId`. Every
  move goes through `POST /api/move` (items and/or places → a target, `null` = Unplaced /
  top level). `planItemMoves` (`src/lib/moveItems.ts`, pure) turns a request into
  relocate / split (part of a quantity → new row copying tags + photo refs) / merge
  (same-named item already there) ops; `executeItemMoves` runs them in one `db.batch`.
  Unset `mergeSameName` + a same-named item in the target → `409 merge_possible` so the UI
  can ask. The response carries `undo`: more move requests (null after a merge). Place
  moves reject cycles (`wouldCreateCycle`). Client entry points share `useMoveAction`
  (merge prompt + "Moved · Undo" toast) and `MoveSheet` (how many? → picker).
- **Free space** (`src/lib/space.ts`, pure): used = items directly inside (volume × qty) +
  child places' outer volume; unknown dimensions are counted, not guessed. `loadPlaces()`
  (`src/lib/viewModels.ts`) returns areas + per-area usage in two queries; pages pass
  `pickerAreas` (with usage) to pickers for "~X free" / "may not fit" hints.
- **Search** (`src/db/queries/search.ts`, `src/lib/searchService.ts`): substring match on
  `f_unaccent(lower(…))` plus pg_trgm `word_similarity ≥ 0.5` for typos, over item name,
  description and tags. The home screen keeps the query in the URL (`/?q=`, `/?tag=`) via
  debounced `router.replace` and renders results on the server — don't sync it with raw
  `history.replaceState`: on mount that runs before Next patches `history` and breaks Back.
- **Deleting a place** (`DELETE /api/areas/[id]?contents=moveUp|deleteAll`): non-empty without
  a choice → `409 not_empty` with counts. `deleteAreaSubtree` clears `parent_id` inside the
  subtree before deleting, because `ON DELETE RESTRICT` is checked row by row.
- **Households & invites**: invite links carry a random token; only its sha256 is stored
  (`householdInvites.tokenHash`), multi-use for 7 days, revocable by owners. `/invite/[token]`
  is public; registering with `?invite=` joins that household instead of creating one.
  `checkLeave` (`src/lib/householdRules.ts`) keeps every household with a member and an owner.
  Member/role management is owner-only (403 — the household itself is the caller's).
- **QR labels**: each area has a 6-char `qrCode`; labels encode `${APP_URL}/a/${code}`.
  `/a/[code]` (behind login) switches to that area's household if the user is a member, then
  redirects to the area. `/labels` renders SVG QR codes server-side; print CSS in
  `globals.css` lays out A4 3 × 7 (63.5 × 38.1 mm) and hides the app chrome (`print:hidden`).
- **Forms** (`ItemForm`, `AreaForm`) seed dimension state with `pickDims(row)` — never the
  whole row, or spreading it into the request body resends stale fields.
- **i18n**: `src/i18n/en.ts` is the source of truth; `el.ts` is typed
  `Record<TKey, string>` so a missing Greek string is a type error (and `i18n.test.ts`
  checks placeholders). Server: `const { t } = await getT()`; client: `useT()`. Signed-in
  locale lives on the user; signed-out pages use the `organiser_locale` cookie, then
  Accept-Language. Every UI string goes through `t()`.
- **Units**: dimensions are integer **cm** everywhere in the DB/API; `src/lib/units.ts`
  formats (cm / m / L / m³, locale-aware decimal comma) and parses user input
  (`"1,2 m"`, `"45 εκ"`).
- **UI**: mobile-first (design at 375px), tap targets ≥ 44px, colour tokens in
  `globals.css` (`bg-surface`, `text-muted`, `bg-accent`, …, light + dark), primitives in
  `src/components/ui.tsx`, inline SVG icons in `src/components/icons.tsx`. System font stack
  (full Greek coverage, nothing to download).

## Testing convention

Vitest covers pure logic only (auth tokens, password hashing, invite tokens, household leave
rules, i18n dictionaries, units, area tree/cycle logic, QR codes, image sizing, recents,
relative time, space math, move planning, search result locating). API routes and pages are
verified manually / with a browser — see `docs/manual-testing-checklist.md`.
