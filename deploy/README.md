# Deploy ke VPS / aaPanel

Panduan singkat instalasi production untuk **Portal Pembagian Kelas SMAN 1 Sooko**.

## Arsitektur

```
Internet → Nginx (aaPanel) → static React (apps/frontend/dist)
                          → /api, /uploads → PM2 → Hono API (:3005)
                                                    → PostgreSQL
```

Satu domain, tanpa CORS ribet: frontend memanggil `/api` (same-origin).

---

## Prasyarat di aaPanel

1. **Node.js** 20 LTS (App Store → Node.js version manager)
2. **PostgreSQL** 14+ (App Store → PostgreSQL)
3. **PM2** — terinstall otomatis lewat script, atau App Store → PM2 Manager
4. **Nginx** — bawaan aaPanel
5. Domain + SSL (Let's Encrypt)

---

## Langkah 1 — Database PostgreSQL

Di aaPanel → **Database** → **PostgreSQL**:

| Field | Contoh |
|-------|--------|
| Database name | `sman1sooko_kelas` |
| Username | `sman1sooko` |
| Password | *(buat password kuat)* |

Catat connection string:

```
postgres://sman1sooko:PASSWORD@127.0.0.1:5432/sman1sooko_kelas
```

---

## Langkah 2 — Clone proyek

SSH ke VPS:

```bash
cd /www/wwwroot
git clone https://github.com/ardianryan/pembagian-kelas-sman1sooko.git kelas.sman1sooko.sch.id
cd kelas.sman1sooko.sch.id
```

> Sesuaikan folder dengan domain Anda.

---

## Langkah 3 — Environment backend

```bash
cp apps/backend/.env.example apps/backend/.env
nano apps/backend/.env
```

Isi minimal:

```env
DATABASE_URL=postgres://USER:PASS@127.0.0.1:5432/sman1sooko_kelas
PORT=3005
ANNOUNCEMENT_DATE=2026-07-15T08:00:00+07:00
FRONTEND_URL=https://kelas.sman1sooko.sch.id
```

---

## Langkah 4 — Jalankan installer

```bash
chmod +x deploy/install.sh deploy/update.sh
npm run deploy:install
```

Script akan:
- `npm ci`
- Build backend + frontend
- Push schema database
- Start API via PM2 (`sman1sooko-kelas-api`)

---

## Langkah 5 — Konfigurasi website aaPanel

1. **Website** → **Add site** → domain Anda
2. **Root directory** → `/www/wwwroot/DOMAIN_ANDA/apps/frontend/dist`
3. **Config** → edit Nginx, tambahkan isi dari `deploy/nginx-site.conf`
   - Ganti `DOMAIN` dengan domain Anda
   - Ganti path `root` jika berbeda
4. **SSL** → Apply Let's Encrypt → Force HTTPS
5. Reload Nginx

### aaPanel — Node Project (opsional)

Jika memakai fitur Node Project aaPanel, cukup jalankan PM2 manual seperti di atas. Frontend tetap di-serve Nginx sebagai static files (lebih ringan).

---

## Langkah 6 — Verifikasi

| URL | Harus |
|-----|-------|
| `https://domain/` | Countdown / login murid |
| `https://domain/back-office` | Login admin |
| `https://domain/api/countdown` | JSON `{ isOpened, targetDate, ... }` |

```bash
pm2 status
pm2 logs sman1sooko-kelas-api --lines 50
curl -s http://127.0.0.1:3005/api/countdown | head
```

---

## Update setelah ada perubahan kode

```bash
cd /www/wwwroot/DOMAIN_ANDA
npm run deploy:update
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| 502 Bad Gateway | `pm2 restart sman1sooko-kelas-api` — cek `pm2 logs` |
| API tidak bisa diakses | Pastikan Nginx proxy `/api/` ke `127.0.0.1:3005` |
| Halaman admin blank setelah refresh | Pastikan `try_files ... /index.html` ada di Nginx |
| Database error | Cek `DATABASE_URL` di `.env`, PostgreSQL running |
| Upload logo gagal | Folder `apps/backend/uploads` writable oleh user PM2 |

---

## Keamanan sebelum go-live

- [ ] Ganti password admin default (`admin` / `adminpass@2026`) di kode atau tambahkan env
- [ ] Aktifkan SSL + force HTTPS
- [ ] Port 3005 **jangan** dibuka di firewall publik (hanya localhost / internal Docker)
- [ ] Backup database PostgreSQL rutin via aaPanel