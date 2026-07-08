#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
ok() { printf '\033[1;32m✔ %s\033[0m\n' "$1"; }

cd "$ROOT_DIR"

if [ -d .git ]; then
  log "Pull perubahan terbaru dari Git"
  git pull --ff-only origin main || git pull origin main
fi

log "Install dependencies"
npm ci

log "Rebuild production"
npm run build

log "Update schema database (jika ada perubahan)"
npm run db:push

log "Restart API PM2"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart sman1sooko-kelas-api || pm2 start deploy/ecosystem.config.cjs
  pm2 save
else
  echo "PM2 tidak ditemukan — restart API manual: npm run start:api"
fi

ok "Update selesai. Frontend static sudah di apps/frontend/dist (Nginx serve otomatis)."