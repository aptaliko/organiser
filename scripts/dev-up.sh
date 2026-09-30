#!/usr/bin/env bash
#
# One command to bring up everything the app needs locally.
#
#   npm run dev:up            # (re)start the stack, keep existing data
#   npm run dev:up -- --reset # same, but wipe the database and start empty
#
# Starts Postgres + a neon-http proxy (docker-compose.yml), applies migrations and seeds
# demo data. The proxy lets local dev use the SAME drizzle-orm/neon-http driver as prod
# (including its no-interactive-transactions limit). Run `npm run dev` afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."

RESET=0
if [[ "${1:-}" == "--reset" ]]; then
  RESET=1
fi

export NEON_LOCAL=1
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/organiser"

info()  { printf '\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()    { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn()  { printf '\033[1;33m! %s\033[0m\n' "$*"; }

if ! docker info >/dev/null 2>&1; then
  echo "Docker doesn't appear to be running. Start Docker Desktop and try again." >&2
  exit 1
fi

if [[ $RESET == 1 ]]; then
  warn "Reset requested — removing containers AND wiping the database volume."
  docker compose down --volumes --remove-orphans >/dev/null 2>&1 || true
else
  info "Stopping any previous run of the stack (data is kept)."
  docker compose down --remove-orphans >/dev/null 2>&1 || true
fi

info "Starting Postgres + neon-http proxy…"
docker compose up -d --wait

info "Waiting for the neon-http proxy to accept connections…"
for i in $(seq 1 30); do
  if (exec 3<>/dev/tcp/localhost/4444) 2>/dev/null; then
    exec 3>&- 3<&-
    ok "Proxy is up."
    break
  fi
  if [[ $i == 30 ]]; then
    echo "Proxy never came up on localhost:4444. Check: docker compose logs neon-proxy" >&2
    exit 1
  fi
  sleep 1
done

info "Applying schema migrations…"
npx tsx scripts/migrate.ts

if [[ -f scripts/seed-dev.ts ]]; then
  info "Seeding development data…"
  npx tsx scripts/seed-dev.ts
fi

if [[ ! -f .env.local ]]; then
  warn ".env.local not found — creating one from .env.local.example."
  cp .env.local.example .env.local
fi

echo
ok "Local stack ready. Next: npm run dev, then open http://localhost:3000"
