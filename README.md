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

Terminal 1 — Backend (port 3000):

```bash
npm run dev:backend
```

Terminal 2 — Frontend (port 5173):

```bash
npm run dev:frontend
```

- Portal murid: http://localhost:5173
- Admin: http://localhost:5173/back-office

### Login Admin Default

| Field | Nilai |
|-------|-------|
| Username | `admin` |
| Password | `adminpass@2026` |

> Ganti kredensial admin sebelum deploy production.

## Build Production

```bash
npm run build:backend
npm run build:frontend
```

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
