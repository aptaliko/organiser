# Organiser

Know where your stuff is — at home, in the storage room, in the warehouse.

A mobile-first web app (installable to the home screen) for a household to track nested
places (warehouse → room → shelf → box) with photos and dimensions, and the items inside
them. Search an item and see exactly where it is: **Warehouse → Room 2 → Blue box**, with a
photo of the box. English and Greek.

**What it does**

- Places inside places, each with photos, dimensions, and (top level) an address.
- Items with photos, quantity, dimensions, tags — or "Unplaced".
- Search that ignores Greek accents and case, and tolerates typos.
- Move anything: one item, part of a quantity, several at once, or a whole box with its
  contents — with Undo, and a prompt to merge into a same-named item that's already there.
- Free space per place ("62% full · ~0.4 m³ free"), "will it fit?" hints while moving, and
  "Where would it fit?" suggestions for an item.
- Households shared with family through invite links (WhatsApp/Viber-friendly).
- Printable QR labels: scan a box with the phone camera to see what's inside.

Docs: [design spec](docs/superpowers/specs/2026-09-30-organiser-mvp-design.md) ·
[implementation plan](docs/superpowers/plans/2026-09-30-organiser-mvp.md) ·
[manual testing checklist](docs/manual-testing-checklist.md)

## Local development

Requires Node 22+ and Docker.

```bash
npm install
npm run dev:up      # Postgres + neon-http proxy in Docker, migrations, demo data; creates .env.local
npm run dev         # http://localhost:3000 — log in as demo@local / demo1234, or register
```

`npm run dev:down` stops the stack; `npm run dev:up -- --reset` wipes the local database.
Without a Blob token, photos are stored in `.local-uploads/` (development only).

Checks: `npm run lint && npm run typecheck && npm test`.

## Environment variables

| Name | What |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon in production) |
| `AUTH_SECRET` | Secret for signing session cookies — `openssl rand -hex 32` |
| `APP_URL` | Public base URL, used in invite links and QR labels (e.g. `https://organiser-xyz.vercel.app`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token, for photos (required in production) |
| `NEON_LOCAL` | `1` only for local Docker development |

## Deploying to Vercel

1. Vercel → **Add New… → Project** → import this repository (framework: Next.js, defaults are fine).
2. In the project's **Storage** tab, add a **Neon** Postgres database (sets `DATABASE_URL`)
   and a **Blob** store (sets `BLOB_READ_WRITE_TOKEN`). Connect both to all environments.
3. **Settings → Environment Variables**: add `AUTH_SECRET` (a new random value — not the one
   from `.env.local.example`) and `APP_URL=https://<your-project>.vercel.app`.
4. Nothing to run by hand for the database: every **production** build applies pending
   migrations before building (`scripts/migrate-on-deploy.ts`, part of `npm run build`), so the
   credentials never leave Vercel. Preview deployments and local builds skip this step. A failed
   migration fails the deploy, and the previous version stays live. The Neon role needs
   permission to `CREATE EXTENSION` (the default owner role has it) for `unaccent` and `pg_trgm`.
5. Deploy (push to `main`, or Redeploy in the dashboard), open the `*.vercel.app` URL on your phone, register, and add it to the home screen.

QR labels encode `APP_URL`, so set it before printing labels. If you later move to your own
domain, labels printed with the old URL keep working only while that URL does.
