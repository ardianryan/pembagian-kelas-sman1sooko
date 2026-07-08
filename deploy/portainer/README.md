# Deploy dengan Docker + Portainer Stack

Stack siap pakai: **PostgreSQL + API + Nginx** dalam satu `docker-compose.yml`.

```
Port 8080 (web) → Nginx → React static
                    ├─ /api     → api:3000
                    └─ /uploads → api:3000
                              ↓
                         PostgreSQL (db)
```

---

## Opsi A — Portainer: Deploy dari Git (disarankan)

1. Buka **Portainer** → **Stacks** → **Add stack**
2. Nama stack: `pembagian-kelas-sman1sooko`
3. **Build method:** Repository
4. Isi:
   | Field | Nilai |
   |-------|-------|
   | Repository URL | `https://github.com/ardianryan/pembagian-kelas-sman1sooko` |
   | Repository reference | `refs/heads/main` |
   | Compose path | `docker-compose.yml` |
   | Authentication | *(kosongkan jika repo public)* |
5. **Environment variables** — tambahkan:

   ```
   POSTGRES_PASSWORD=BuatPasswordKuat123!
   HTTP_PORT=8080
   ANNOUNCEMENT_DATE=2026-07-15T08:00:00+07:00
   FRONTEND_URL=http://IP_VPS:8080
   ```

   > `POSTGRES_PASSWORD` **wajib**. Tanpa ini stack gagal deploy.

6. Aktifkan **Pull latest image** / **Rebuild** (jika ada opsi build)
7. Klik **Deploy the stack**

Build pertama memakan waktu ±3–5 menit (download Node + compile).

---

## Opsi B — Portainer: Web editor (paste compose)

1. **Stacks** → **Add stack**
2. **Build method:** Web editor
3. Salin seluruh isi file `docker-compose.yml` dari repository
4. Tambahkan environment variables (sama seperti Opsi A)
5. **Deploy the stack**

> Untuk web editor, Portainer perlu akses ke source code untuk `build:`.  
> Lebih mudah clone repo ke VPS dulu:

```bash
cd /opt
git clone https://github.com/ardianryan/pembagian-kelas-sman1sooko.git
```

Lalu di Portainer pilih **Upload** atau path lokal jika Portainer mendukung,  
atau gunakan **Opsi C** (CLI) di folder clone.

---

## Opsi C — Docker Compose via SSH (paling mudah diuji)

```bash
git clone https://github.com/ardianryan/pembagian-kelas-sman1sooko.git
cd pembagian-kelas-sman1sooko

cp .env.docker.example .env
nano .env   # wajib ganti POSTGRES_PASSWORD

docker compose up -d --build
```

Cek status:

```bash
docker compose ps
docker compose logs -f api
```

Akses:
- Portal murid: `http://IP_VPS:8080/`
- Admin: `http://IP_VPS:8080/back-office`

---

## Environment variables

| Variable | Wajib | Default | Keterangan |
|----------|-------|---------|------------|
| `POSTGRES_PASSWORD` | ✅ | — | Password database |
| `POSTGRES_DB` | | `sman1sooko_kelas` | Nama database |
| `POSTGRES_USER` | | `sman1sooko` | User database |
| `HTTP_PORT` | | `8080` | Port publik web |
| `ANNOUNCEMENT_DATE` | | `2026-07-15T08:00:00+07:00` | Jadwal buka portal |
| `FRONTEND_URL` | | `http://localhost:8080` | URL untuk CORS |

---

## Reverse proxy + domain (Traefik / Nginx Proxy Manager)

Jika pakai domain `https://kelas.sekolah.sch.id` di depan stack:

1. Set `HTTP_PORT` ke port internal (mis. tetap `8080`)
2. Proxy manager arahkan domain → `http://host:8080`
3. Update `FRONTEND_URL=https://kelas.sekolah.sch.id`
4. Redeploy stack (Portainer → Stack → Update)

---

## Update stack

### Portainer (Git deploy)
Stack → **Pull and redeploy** / **Update the stack**

### CLI
```bash
cd pembagian-kelas-sman1sooko
git pull
docker compose up -d --build
```

---

## Volume & backup

| Volume | Isi |
|--------|-----|
| `postgres_data` | Database murid & pengaturan |
| `uploads_data` | Logo sekolah yang diunggah admin |

Backup PostgreSQL:

```bash
docker compose exec db pg_dump -U sman1sooko sman1sooko_kelas > backup.sql
```

Restore:

```bash
cat backup.sql | docker compose exec -T db psql -U sman1sooko sman1sooko_kelas
```

---

## Troubleshooting

| Gejala | Perbaikan |
|--------|-----------|
| Stack gagal deploy, error `POSTGRES_PASSWORD` | Isi env `POSTGRES_PASSWORD` di Portainer |
| `api` restart loop | `docker compose logs api` — cek koneksi DB |
| Halaman putih / 502 | Tunggu build selesai; cek `docker compose ps` semua healthy |
| `/api/countdown` error | API belum siap; lihat log container `api` |
| Upload logo gagal | Volume `uploads_data` harus ter-mount |

---

## Login admin default

| Username | Password |
|----------|----------|
| `admin` | `adminpass@2026` |

**Ganti sebelum go-live!**