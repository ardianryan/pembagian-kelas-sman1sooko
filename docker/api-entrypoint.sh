#!/bin/sh
set -e

echo "[api] Menunggu PostgreSQL siap..."
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.end())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
" 2>/dev/null; do
  sleep 2
done

echo "[api] Sinkronisasi schema database..."
cd /app
npm run db:push --workspace=apps/backend

echo "[api] Menjalankan server..."
cd /app/apps/backend
exec node dist/src/index.js