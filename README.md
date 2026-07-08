# Pengumuman Pembagian Kelas — SMAN 1 Sooko

Portal informasi pembagian kelas untuk murid dan panel admin sekolah. Monorepo berisi frontend React (Vite) dan backend API (Hono + PostgreSQL).

## Fitur

### Portal Murid (`/`)
- Countdown hingga waktu pengumuman dibuka
- Login dengan NISN + NIPD
- Dashboard kelas, profil, kutipan per murid, tips, dan perayaan
- Lihat teman sekelas (popup, dapat dinonaktifkan admin)

### Panel Admin (`/back-office`)
- Dashboard statistik murid & kelas
- Manajemen data murid (CRUD)
- Impor Excel + unduh template
- Jadwal rilis countdown
- Pengaturan branding sekolah & fitur portal

## Struktur Proyek

```
apps/
  frontend/   # React + Vite + Tailwind v4
  backend/    # Hono API + Drizzle ORM + PostgreSQL
```

## Prasyarat

- Node.js 20+
- PostgreSQL
- npm

## Instalasi

```bash
# Clone repository
git clone https://github.com/ardianryan/pembagian-kelas-sman1sooko.git
cd pembagian-kelas-sman1sooko

# Install dependencies (workspace monorepo)
npm install

# Salin environment backend
cp apps/backend/.env.example apps/backend/.env
# Edit DATABASE_URL dan konfigurasi lain di apps/backend/.env

# Push schema database
npm run db:push
```

## Menjalankan Development

Terminal 1 — Backend (port 3005):

```bash
npm run dev:backend
```

Terminal 2 — Frontend (port 5272):

```bash
npm run dev:frontend
```

- Portal murid: http://localhost:5272
- Admin: http://localhost:5272/back-office

### Login Admin Default

| Field | Nilai |
|-------|-------|
| Username | `admin` |
| Password | `adminpass@2026` |

> Ganti kredensial admin sebelum deploy production.

## Build Production

```bash
npm run build
```

## Deploy ke VPS / aaPanel

Instalasi production satu perintah (setelah `.env` backend diisi):

```bash
cp apps/backend/.env.example apps/backend/.env
# edit DATABASE_URL & FRONTEND_URL
chmod +x deploy/*.sh
npm run deploy:install
```

Lalu atur Nginx di aaPanel mengikuti `deploy/nginx-site.conf`.

Panduan lengkap: **[deploy/README.md](deploy/README.md)**

| Perintah | Fungsi |
|----------|--------|
| `npm run deploy:install` | Instal pertama kali (build + DB + PM2) |
| `npm run deploy:update` | Update kode + rebuild + restart API |

## Deploy dengan Docker / Portainer Stack

Satu perintah (setelah `.env` diisi):

```bash
cp .env.docker.example .env.docker
# edit POSTGRES_PASSWORD
docker compose --env-file .env.docker up -d --build
```

**Portainer:** Stacks → Add stack → Repository →  
`https://github.com/ardianryan/pembagian-kelas-sman1sooko` → compose path `docker-compose.yml`  
→ set `POSTGRES_PASSWORD` di environment.

Panduan lengkap Portainer: **[deploy/portainer/README.md](deploy/portainer/README.md)**

| Perintah | Fungsi |
|----------|--------|
| `npm run docker:up` | Build & jalankan stack |
| `npm run docker:down` | Stop stack |
| `npm run docker:logs` | Lihat log semua service |

Akses default: `http://localhost:5272` (portal + `/back-office`, API internal `:3005`)

## API Utama

| Endpoint | Deskripsi |
|----------|-----------|
| `GET /api/countdown` | Status portal & branding |
| `POST /api/auth/login` | Login murid |
| `GET /api/auth/classmates` | Daftar teman sekelas |
| `POST /api/admin/import` | Impor data Excel |
| `GET /api/admin/import/template` | Unduh template Excel |

## Lisensi

Lihat [LICENSE](LICENSE) (MIT). Proyek internal SMAN 1 Sooko Mojokerto.
