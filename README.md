# Organiser

Know where your stuff is — at home, in the storage room, in the warehouse.

A mobile-first web app (installable to the home screen) for a household to track nested
storage places (warehouse → room → shelf → box) with photos and dimensions, and the items
inside them. Search an item and see exactly where it is: **Warehouse → Room 2 → Blue box**,
with a photo of the box. English and Greek.

- Design: [`docs/superpowers/specs/2026-09-30-organiser-mvp-design.md`](docs/superpowers/specs/2026-09-30-organiser-mvp-design.md)
- Plan: [`docs/superpowers/plans/2026-09-30-organiser-mvp.md`](docs/superpowers/plans/2026-09-30-organiser-mvp.md)

## Local development

Requires Node 22+ and Docker.

```bash
npm install
npm run dev:up      # Postgres + neon-http proxy in Docker, runs migrations; creates .env.local
npm run dev         # http://localhost:3000 — register an account to start
```

`npm run dev:down` stops the stack; `npm run dev:up -- --reset` wipes the local database.

Checks: `npm run lint && npm run typecheck && npm test`.

## Environment variables

| Name | What |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon in production) |
| `AUTH_SECRET` | Secret for signing session cookies — `openssl rand -hex 32` |
| `APP_URL` | Public base URL, used in invite links and QR labels |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token, for photos |
| `NEON_LOCAL` | `1` only for local Docker development |

## Deploying to Vercel

1. Vercel → **Add New… → Project** → import this repository (framework: Next.js, defaults are fine).
2. In the project's **Storage** tab, add a **Neon** Postgres database (sets `DATABASE_URL`)
   and a **Blob** store (sets `BLOB_READ_WRITE_TOKEN`).
3. **Settings → Environment Variables**: add `AUTH_SECRET` and
   `APP_URL=https://<your-project>.vercel.app`.
4. Apply migrations to the Neon database once (and after every schema change):
   put its `DATABASE_URL` in a local `.env.local` (without `NEON_LOCAL`) and run `npm run db:migrate`.
5. Redeploy, open the `*.vercel.app` URL, register.
