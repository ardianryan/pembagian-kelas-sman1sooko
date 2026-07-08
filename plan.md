# Rencana Implementasi: Aplikasi Pengumuman Pembagian Kelas SMAN 1 Sooko

Dokumen ini berisi panduan teknis lengkap dan terperinci untuk membangun aplikasi **Pengumuman Pembagian Kelas** menggunakan arsitektur **Monorepo**, **React + Vite** (frontend), **Hono.js** (backend), **PostgreSQL** (local), dan **Drizzle ORM**.

---

## 1. Rincian Desain & Estetika (Design Taste - Referensi: Academic Bento)

Berdasarkan pedoman sistem desain **Academic Bento**, antarmuka aplikasi ini dirancang agar **Authoritative, Modern, Struktur, dan Taktil**:
* **Desain Dial Config**:
  * `DESIGN_VARIANCE: 7` (Asimetris, bento-grid, modern, berwibawa namun bersahabat bagi siswa).
  * `MOTION_INTENSITY: 6` (Animasi transisi halus pegas/spring, efek celebratory naik kelas, dan hover scale).
  * `VISUAL_DENSITY: 4` (Informasi padat namun tertata rapi dalam modular bento-box).
* **Palet Warna (Tema Terkalibrasi)**:
  * **Background (Surface)**: `#f7f9fb` (Light gray/blue neutral background).
  * **Card Surface**: `#ffffff` (Solid white untuk area bento card).
  * **Primary (Navy Blue)**: `#000a3d` (Representasi wibawa sekolah, digunakan untuk tombol utama, navigasi, dan judul).
  * **Secondary (Light Blue)**: `#075fab` (Digunakan untuk hover, status link, highlight, dan aksen taktil).
  * **Accent Red (Kenaikan Kelas)**: `#ba1a1a` (Untuk merayakan banner kenaikan kelas bersama kuning emas).
  * **Accent Yellow (Golden Highlights)**: `#ffd300` / `#fbbf24` (Untuk ornamen bintang atau highlight prestasi emas).
  * **Borders (Outline)**: `#e6e8ea` / `#c5c5d3` (Batas kartu flat tipis 1px).
* **Tipografi & Font Pairing**:
  * **IBM Plex Sans**: Digunakan untuk elemen display, judul/headings (`font-headline-lg`), sub-judul, dan label kategori (`font-label-md`). Menghasilkan nuansa sistematis dan teknis akademis.
  * **Inter**: Digunakan untuk teks deskripsi (`font-body-md`) dan isi dokumen agar legibilitas tetap prima di resolusi kecil.
* **Efek & Keadaan Taktil (Tactile States)**:
  * **Hover Bento Card**: Efek spring scale-up lembut `transform: scale(1.02)` disertai pergeseran border ke warna secondary (`#075fab`) dan bayangan redup Navy.
  * **Taktil Form Input**: Kelas `input-taktil` memiliki latar awal `#f2f4f6`. Saat menerima fokus, latar berubah menjadi putih bersih dengan inset border-ring 2px `#075fab`.
  * **Pegas Tombol (Spring Button)**: Pada saat ditekan/di-klik (`:active`), tombol mengecil secara instan `transform: scale(0.97)` untuk mensimulasikan tombol fisik.
* **Fitur Interaktif "Fun, Informatif & Edukatif"**:
  1. **Fun (Celebratory)**: Mengintegrasikan `canvas-confetti` dan ornamen partikel konfeti merah-kuning emas saat menampilkan kartu kelulusan siswa.
  2. **Informatif (Asymmetric Bento)**: Struktur grid asimetris 12-kolom pada desktop (6-kolom pada tablet, 1-kolom pada mobile) dengan pembagian kartu identitas (col-span-4), profil siswa (col-span-8), serta program studi/wali kelas.
  3. **Edukatif**: Widget advis khusus Ki Hajar Dewantara dan daftar tips sukses menghadapi kelas baru di sisi kanan bawah.

---

## 2. Struktur Direktori Monorepo

Proyek ini menggunakan **npm workspaces** untuk memisahkan logika frontend dan backend dalam satu repositori tunggal agar manajemen port dan shared-types berjalan lancar.

```text
pembagian-kelas-sman1sooko/
├── apps/
│   ├── backend/             # Hono.js API Server
│   │   ├── src/
│   │   │   ├── db/          # Drizzle Schema & Connection
│   │   │   │   ├── index.ts
│   │   │   │   └── schema.ts
│   │   │   └── index.ts     # Main Server Entry
│   │   ├── drizzle/         # Generated SQL Migrations
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/            # React + Vite Client
│       ├── src/
│       │   ├── components/  # Reusable UI Elements (Countdown, Card, EducationalCard)
│       │   ├── App.jsx
│       │   ├── index.css    # Tailwind Core & Fonts
│       │   └── main.jsx
│       ├── package.json
│       └── vite.config.js
├── package.json             # Root Workspace Config
└── plan.md                  # Rencana Teknis ini
```

### Konfigurasi Root (`package.json`)
```json
{
  "name": "sman1sooko-kelas-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=apps/backend",
    "dev:frontend": "npm run dev --workspace=apps/frontend",
    "build:backend": "npm run build --workspace=apps/backend",
    "build:frontend": "npm run build --workspace=apps/frontend",
    "db:push": "npm run db:push --workspace=apps/backend",
    "db:generate": "npm run db:generate --workspace=apps/backend"
  }
}
```

---

## 3. Skema & Konfigurasi Database (PostgreSQL + Drizzle)

### Kredensial Database Lokal (PostgreSQL)
* **Host**: `localhost`
* **Port**: `5432`
* **User**: `ardianryan`
* **Password**: `M0jokerto1`
* **Database Name**: `sman1sooko_kelas`
* **URL Koneksi**: `postgres://ardianryan:M0jokerto1@localhost:5432/sman1sooko_kelas`

### Skema Tabel Siswa (`apps/backend/src/db/schema.ts`)
Pemetaan skema data disesuaikan secara presisi dengan baris kolom Microsoft Excel yang diberikan sekolah:

```typescript
import { pgTable, serial, varchar, char, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Skema tabel siswa
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  urut: varchar('urut', { length: 10 }),
  nipd: varchar('nipd', { length: 50 }).notNull(),          // NIS / NIPD untuk pencarian (Login)
  nisn: varchar('nisn', { length: 50 }).notNull().unique(),  // NISN untuk pencarian (Login)
  nama: varchar('nama', { length: 255 }).notNull(),
  jk: char('jk', { length: 1 }).notNull(),                  // L = Laki-laki, P = Perempuan
  namawalas: varchar('namawalas', { length: 255 }).notNull(),// Nama Wali Kelas
  peminatan: varchar('peminatan', { length: 100 }).notNull(),// Nama Peminatan (e.g., PEMINATAN 1)
  kelas: varchar('kelas', { length: 50 }).notNull(),         // Kelas Baru (e.g., KELAS XI-1)
  createdAt: timestamp('created_at').defaultNow()
});

// Skema pengaturan admin (untuk menyimpan waktu target pengumuman secara dinamis)
export const config = pgTable('config', {
  key: varchar('key', { length: 50 }).primaryKey(),
  value: varchar('value', { length: 255 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

---

## 4. Implementasi Backend (Hono.js)

Backend berjalan menggunakan Node.js dan Hono web framework karena performanya sangat ringan dan berbasis standar.

### Endpoint API Utama (`apps/backend/src/index.ts`)

1. **`GET /api/countdown`**
   * Mengembalikan target waktu rilis pengumuman dan status apakah pengumuman sudah dibuka.
2. **`POST /api/auth/login`**
   * Menerima payload `{ nisn, nis }` (NIS memetakan ke database kolom `nipd`).
   * Melakukan validasi penguncian waktu rilis. Jika gerbang belum dibuka, kirim status `403 Forbidden`.
   * Melakukan lookup ke database menggunakan Drizzle ORM:
     ```typescript
     and(eq(students.nisn, nisn), eq(students.nipd, nis))
     ```
3. **`POST /api/admin/login`**
   * Autentikasi Admin default. Kredensial hardcoded sesuai permintaan:
     * **Username**: `admin`
     * **Password**: `adminpass@2026`
   * Mengembalikan token sesi admin.
4. **`POST /api/admin/config`**
   * Mengubah target tanggal rilis pengumuman secara dinamis di database.
5. **`POST /api/admin/import`**
   * Menerima unggahan file Excel `.xlsx` menggunakan Multipart Form.
   * Parsing buffer data menggunakan package `xlsx`.
   * Melakukan pemetaan kolom Excel:
     * `URUT` ➔ `urut`
     * `NIPD` ➔ `nipd`
     * `NISN` ➔ `nisn`
     * `Nama` / `Nama Siswa` ➔ `nama`
     * `JK` ➔ `jk`
     * `namawalas` ➔ `namawalas`
     * `peminatan` ➔ `peminatan`
     * `KELAS` ➔ `kelas`
   * Melakukan operasi **Upsert** (Insert on Conflict Update) berdasarkan index kunci unik `nisn` agar jika ada perubahan data dari Excel, data lama otomatis diperbarui tanpa duplikasi data.

---

## 5. Implementasi Frontend (React + Vite)

Frontend dibangun dengan arsitektur SPA yang adaptif terhadap perangkat mobile, memiliki transisi tema gelap/terang secara otomatis, dan mengintegrasikan animasi interaktif.

### Siklus Tampilan Utama (Empat State Layout):

### Tampilan A: Mode Menunggu Rilis (Countdown)
Jika waktu rilis pengumuman belum tercapai, antarmuka akan memblokir form login dan menyajikan:
* Status Badge: *"Gerbang Informasi Belum Dibuka"*
* Desain visual countdown digital yang rapi (`Hari` : `Jam` : `Menit` : `Detik`) dengan animasi detak transisi per detik.
* Pilihan tombol menuju login admin secara tersembunyi/minimalis di bagian pojok bawah.

### Tampilan B: Gerbang Akses Masuk (Login)
Ketika countdown selesai, halaman secara otomatis bertransisi membuka form login:
* Input fields:
  1. **Nomor Induk Siswa Nasional (NISN)** (Placeholder: *"Masukkan 10 digit NISN..."*)
  2. **Nomor Induk Siswa (NIS / NIPD)** (Placeholder: *"Masukkan nomor NIS/NIPD..."*)
* Pesan validasi yang taktil apabila terjadi kegagalan pencarian data.
* Tombol CTA: *"Periksa Pembagian Kelas"* dengan transisi scale active state.

### Tampilan C: Kartu Pengumuman Kelas (Bento Grid + Confetti)
Jika lookup data sukses, tampilkan antarmuka kartu editorial bento-grid:
* **Semburan Konfeti**: Memicu fungsi `canvas-confetti` secara instan untuk memberikan pengalaman kejutan yang menyenangkan (Fun).
* **Banner Kelulusan Utama**:
  ```text
  🎉 SELAMAT ANDA DINAYAKAN NAIK KELAS. 🎉
  ```
  *(Berwarna hijau segar di light mode, berpendar lembut di dark mode dengan animasi spring scale-up)*.
* **Tabel Detail Penempatan Kelas (7 Parameter)**:
  1. **NISN**: `<data_nisn>`
  2. **NIS**: `<data_nipd>`
  3. **NAMA**: `<data_nama_kapital>`
  4. **Jenis Kelamin**: `Laki-laki` / `Perempuan`
  5. **Peminatan**: `<data_peminatan>`
  6. **Kelas Baru**: `<data_kelas_baru>` (diberi badge aksen tebal)
  7. **Wali Kelas**: `<data_wali_kelas>` (diletakkan di bagian bawah dengan highlight khusus)
* **Widget Edukatif (Quotes Belajar & Tips)**:
  * Menampilkan box berisi kutipan Ki Hajar Dewantara: *"Ing Ngarsa Sung Tulada, Ing Madya Mangun Karsa, Tut Wuri Handayani"* atau kata bijak motivasi belajar lainnya.
  * Dilengkapi tips singkat menyambut tahun ajaran baru, seperti kesiapan mental belajar mandiri dan pentingnya kolaborasi kelompok.
* Tombol: *"Keluar & Kembali"* untuk menghapus session data dan kembali ke halaman login.

### Tampilan D: Dasbor Administrasi (Admin Control Panel)
* Form login khusus admin (`admin` / `adminpass@2026`).
* Widget pengubah tanggal target rilis pengumuman.
* **Drag-and-Drop Area Importer**:
  * Area drop file Excel dengan validasi tipe berkas `.xlsx`.
  * Tombol unggah dan indikator progress pemrosesan baris data.
  * Laporan statistik ringkas: Jumlah data siswa aktif di database.

---

## 6. Rencana Verifikasi Pengujian

### Pengujian Otomatis & Skrip
* Verifikasi Drizzle migration dengan menjalankan command generator lokal.
* Uji endpoint API `/api/auth/login` menggunakan mock request script.
* Pengujian unit parser file excel dengan mengunggah sampel 6 baris data siswa yang diberikan.

### Verifikasi Manual
* Uji ketahanan responsivitas mobile di berbagai skala viewport layar smartphone.
* Uji fungsionalitas peralihan warna adaptif (sistem OS preference) serta penyimpanan manual di `localStorage`.
* Simulasi pergantian target countdown melewati batas waktu untuk memastikan form login muncul secara instan tanpa perlu reload manual.