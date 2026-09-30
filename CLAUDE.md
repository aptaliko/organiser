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
npm run db:migrate     # apply migrations (uses .env.local)
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

Vitest covers pure logic only (auth tokens, password hashing, i18n dictionaries, units, and —
as they land — space math, area-tree/cycle logic, move planning). API routes and pages are
verified manually / with a browser.
