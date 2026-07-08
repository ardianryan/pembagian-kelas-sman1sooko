#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV="$ROOT_DIR/apps/backend/.env"
FRONTEND_ENV="$ROOT_DIR/apps/frontend/.env.production"

log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
ok() { printf '\033[1;32m✔ %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$1"; }
fail() { printf '\033[1;31m✖ %s\033[0m\n' "$1"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Perintah '$1' tidak ditemukan. Install dulu sebelum lanjut."
}

log "Portal Pembagian Kelas — Instalasi VPS / aaPanel"
echo "Direktori proyek: $ROOT_DIR"

require_cmd node
require_cmd npm

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js 18+ diperlukan. Versi saat ini: $(node -v)"
fi

mkdir -p "$ROOT_DIR/logs"
mkdir -p "$ROOT_DIR/apps/backend/uploads"

if [ ! -f "$BACKEND_ENV" ]; then
  log "Membuat apps/backend/.env dari template"
  cp "$ROOT_DIR/apps/backend/.env.example" "$BACKEND_ENV"
  warn "Edit $BACKEND_ENV — isi DATABASE_URL dan FRONTEND_URL sebelum lanjut."
  echo "Lalu jalankan ulang: npm run deploy:install"
  exit 1
fi

# Pastikan DATABASE_URL sudah diisi (bukan placeholder default)
if grep -q 'dbuser:dbpassword' "$BACKEND_ENV"; then
  fail "DATABASE_URL masih default. Edit $BACKEND_ENV dengan kredensial PostgreSQL aaPanel Anda."
fi

log "Install dependencies"
cd "$ROOT_DIR"
npm ci

log "Build production (backend + frontend)"
npm run build

log "Sinkronisasi schema database"
npm run db:push

if ! command -v pm2 >/dev/null 2>&1; then
  log "PM2 belum ada — menginstall global"
  npm install -g pm2
fi

log "Menjalankan API dengan PM2"
cd "$ROOT_DIR"
pm2 delete sman1sooko-kelas-api >/dev/null 2>&1 || true
pm2 start deploy/ecosystem.config.cjs
pm2 save

if pm2 startup | grep -q 'sudo'; then
  warn "Jalankan perintah 'pm2 startup' yang ditampilkan PM2 agar API auto-start saat reboot."
fi

ok "Instalasi selesai"
echo ""
echo "Langkah berikutnya di aaPanel:"
echo "  1. Buat website untuk domain Anda"
echo "  2. Root direktori: $ROOT_DIR/apps/frontend/dist"
echo "  3. Salin config dari deploy/nginx-site.conf (ganti DOMAIN)"
echo "  4. Aktifkan SSL (Let's Encrypt) di aaPanel"
echo "  5. Buka https://DOMAIN/ dan https://DOMAIN/back-office"
echo ""
echo "Perintah berguna:"
echo "  pm2 status"
echo "  pm2 logs sman1sooko-kelas-api"
echo "  npm run deploy:update   # update kode dari git + rebuild"
echo ""
warn "Ganti password admin default sebelum go-live!"