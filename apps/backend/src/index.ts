import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import * as xlsx from 'xlsx';
import * as dotenv from 'dotenv';
import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getQuoteIndexForStudent } from './quoteIndex.js';
import { buildImportTemplateBuffer, IMPORT_TEMPLATE_FILENAME } from './importTemplate.js';
import { getPortalSettings, savePortalSettings } from './portalSettings.js';
import { mapClassmatesForStudent } from './classmates.js';
import {
  ADMIN_SESSION_TOKEN,
  changeAdminPassword,
  verifyAdminCredentials,
} from './adminAuth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const BRANDING_DEFAULTS = {
  schoolName: 'SMAN 1 Sooko',
  schoolTagline: 'Portal Informasi Sekolah',
  footerCopy: '© 2026 SMAN 1 Sooko Mojokerto. All Rights Reserved.',
  itTeamLabel: 'TIM IT',
  logoUrl: '/icon.png',
} as const;

const BRANDING_CONFIG_KEYS = {
  schoolName: 'SCHOOL_NAME',
  schoolTagline: 'SCHOOL_TAGLINE',
  footerCopy: 'FOOTER_COPY',
  itTeamLabel: 'IT_TEAM_LABEL',
  logoUrl: 'SCHOOL_LOGO',
} as const;

const app = new Hono();

async function ensureUploadsDir() {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

function isAdminAuthorized(auth: string | undefined) {
  return auth === `Bearer ${ADMIN_SESSION_TOKEN}`;
}

async function getStudentFromAuthHeader(auth: string | undefined) {
  if (!auth || !auth.startsWith('Bearer student-')) {
    return null;
  }

  const token = auth.replace('Bearer student-', '').trim();
  const parts = token.split('-');
  if (parts.length < 2) {
    return null;
  }

  const nisn = parts[0];
  const nipd = parts.slice(1).join('-');

  return db.query.students.findFirst({
    where: and(
      eq(schema.students.nisn, nisn),
      eq(schema.students.nipd, nipd)
    ),
  });
}

async function buildStudentSessionPayload(student: typeof schema.students.$inferSelect) {
  let classStats = { total: 0, boys: 0, girls: 0 };
  let classStudents: typeof schema.students.$inferSelect[] = [];

  if (student.kelas) {
    classStudents = await db
      .select()
      .from(schema.students)
      .where(eq(schema.students.kelas, student.kelas));
    classStats = {
      total: classStudents.length,
      boys: classStudents.filter((s) => s.jk === 'L').length,
      girls: classStudents.filter((s) => s.jk === 'P').length,
    };
  }

  const quoteIndex = getQuoteIndexForStudent(student, classStudents);

  return {
    data: { ...student, quoteIndex },
    classStats,
  };
}

async function getConfigValue(key: string, fallback = ''): Promise<string> {
  try {
    const record = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, key))
      .limit(1);

    if (record.length > 0) {
      return record[0].value;
    }
  } catch (err) {
    console.error(`Error fetching config key ${key}:`, err);
  }
  return fallback;
}

async function setConfigValue(key: string, value: string) {
  await db
    .insert(schema.config)
    .values({ key, value })
    .onConflictDoUpdate({
      target: schema.config.key,
      set: { value, updatedAt: new Date() },
    });
}

async function getBranding() {
  const logoPath = await getConfigValue(BRANDING_CONFIG_KEYS.logoUrl, '');
  return {
    schoolName: await getConfigValue(BRANDING_CONFIG_KEYS.schoolName, BRANDING_DEFAULTS.schoolName),
    schoolTagline: await getConfigValue(BRANDING_CONFIG_KEYS.schoolTagline, BRANDING_DEFAULTS.schoolTagline),
    footerCopy: await getConfigValue(BRANDING_CONFIG_KEYS.footerCopy, BRANDING_DEFAULTS.footerCopy),
    itTeamLabel: await getConfigValue(BRANDING_CONFIG_KEYS.itTeamLabel, BRANDING_DEFAULTS.itTeamLabel),
    logoUrl: logoPath || BRANDING_DEFAULTS.logoUrl,
  };
}

function sanitizeUploadFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '');
}

// Enable CORS so the React frontend can talk to the API
const corsOrigin = process.env.FRONTEND_URL?.trim() || '*';
app.use('/*', cors({
  origin: corsOrigin,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Helper to get active announcement date (checking Database first, then Env)
async function getAnnouncementDate(): Promise<Date> {
  try {
    const record = await db
      .select()
      .from(schema.config)
      .where(eq(schema.config.key, 'ANNOUNCEMENT_DATE'))
      .limit(1);
    
    if (record.length > 0) {
      return new Date(record[0].value);
    }
  } catch (err) {
    console.error('Error fetching config from DB:', err);
  }
  return new Date(process.env.ANNOUNCEMENT_DATE || '2026-07-15T08:00:00+07:00');
}

// Serve uploaded branding assets
app.get('/uploads/:filename', async (c) => {
  const filename = sanitizeUploadFilename(c.req.param('filename'));
  if (!filename) {
    return c.json({ error: 'File tidak valid.' }, 400);
  }

  try {
    const filePath = path.join(UPLOADS_DIR, filename);
    const file = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.webp' ? 'image/webp'
      : ext === '.svg' ? 'image/svg+xml'
      : 'application/octet-stream';

    return new Response(file, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return c.json({ error: 'File tidak ditemukan.' }, 404);
  }
});

// Public branding configuration
app.get('/api/branding', async (c) => {
  const branding = await getBranding();
  return c.json(branding);
});

// 1. Endpoint: Check release time and countdown details
app.get('/api/countdown', async (c) => {
  const targetDate = await getAnnouncementDate();
  const now = new Date();
  const branding = await getBranding();
  return c.json({
    isOpened: now >= targetDate,
    targetDate: targetDate.toISOString(),
    branding,
  });
});

// 2. Endpoint: Student login lookup (NISN + NIS/NIPD validation)
app.post('/api/auth/login', async (c) => {
  const targetDate = await getAnnouncementDate();
  const now = new Date();
  
  if (now < targetDate) {
    return c.json({ error: 'Akses Ditolak. Waktu pengumuman pembagian kelas belum dibuka!' }, 403);
  }

  const { nisn, nis } = await c.req.json();
  if (!nisn || !nis) {
    return c.json({ error: 'Data tidak lengkap! NISN dan NIPD wajib diisi.' }, 400);
  }

  try {
    const student = await db.query.students.findFirst({
      where: and(
        eq(schema.students.nisn, String(nisn).trim()),
        eq(schema.students.nipd, String(nis).trim())
      ),
    });

    if (!student) {
      return c.json({ error: 'Kombinasi data NISN dan NIPD tidak ditemukan!' }, 404);
    }

    const { data, classStats } = await buildStudentSessionPayload(student);
    const portalSettings = await getPortalSettings();
    const token = `student-${student.nisn}-${student.nipd}`;

    return c.json({ success: true, data, token, classStats, portalSettings });
  } catch (err: any) {
    return c.json({ error: `Gagal mengakses database: ${err.message}` }, 500);
  }
});

// 3. Endpoint: Get current logged-in student session
app.get('/api/auth/me', async (c) => {
  const auth = c.req.header('Authorization');

  try {
    const student = await getStudentFromAuthHeader(auth);
    if (!student) {
      return c.json({ error: 'Tidak terotentikasi.' }, 401);
    }

    const { data, classStats } = await buildStudentSessionPayload(student);
    const portalSettings = await getPortalSettings();

    return c.json({ success: true, data, classStats, portalSettings });
  } catch (err: any) {
    return c.json({ error: `Database error: ${err.message}` }, 500);
  }
});

// 3b. Endpoint: Get classmates in the same class (student)
app.get('/api/auth/classmates', async (c) => {
  const auth = c.req.header('Authorization');

  try {
    const portalSettings = await getPortalSettings();
    if (!portalSettings.classmatesVisible) {
      return c.json({ error: 'Fitur teman sekelas tidak tersedia.' }, 403);
    }

    const student = await getStudentFromAuthHeader(auth);
    if (!student) {
      return c.json({ error: 'Tidak terotentikasi.' }, 401);
    }

    if (!student.kelas) {
      return c.json({
        success: true,
        classmates: [],
        classStats: { total: 0, boys: 0, girls: 0 },
        kelas: '',
      });
    }

    const classStudents = await db
      .select()
      .from(schema.students)
      .where(eq(schema.students.kelas, student.kelas));

    const classStats = {
      total: classStudents.length,
      boys: classStudents.filter((s) => s.jk === 'L').length,
      girls: classStudents.filter((s) => s.jk === 'P').length,
    };

    return c.json({
      success: true,
      kelas: student.kelas,
      classmates: mapClassmatesForStudent(student, classStudents),
      classStats,
    });
  } catch (err: any) {
    return c.json({ error: `Gagal memuat teman sekelas: ${err.message}` }, 500);
  }
});

// 4. Endpoint: Admin authenticate login
app.post('/api/admin/login', async (c) => {
  const { username, password } = await c.req.json();
  const normalizedUsername = String(username || '').trim();
  const normalizedPassword = String(password || '');

  const valid = await verifyAdminCredentials(normalizedUsername, normalizedPassword);
  if (valid) {
    return c.json({ success: true, token: ADMIN_SESSION_TOKEN });
  }

  return c.json({ error: 'Username atau Password admin salah!' }, 401);
});

// 5. Endpoint: Verify admin session
app.get('/api/admin/me', async (c) => {
  const auth = c.req.header('Authorization');
  if (isAdminAuthorized(auth)) {
    return c.json({ success: true, user: 'admin' });
  }
  return c.json({ error: 'Akses ditolak.' }, 401);
});

// 5b. Endpoint: Change admin password
app.post('/api/admin/change-password', async (c) => {
  const auth = c.req.header('Authorization');
  if (!isAdminAuthorized(auth)) {
    return c.json({ error: 'Akses ditolak. Tidak ada otorisasi admin.' }, 403);
  }

  const body = await c.req.json();
  const result = await changeAdminPassword(body.currentPassword, body.newPassword);

  if (!result.ok) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({ success: true, message: 'Password admin berhasil diperbarui.' });
});

// 6a. Endpoint: Read branding settings (admin)
app.get('/api/admin/branding', async (c) => {
  const auth = c.req.header('Authorization');
  if (!isAdminAuthorized(auth)) {
    return c.json({ error: 'Akses ditolak. Tidak ada otorisasi admin.' }, 403);
  }

  const branding = await getBranding();
  return c.json({ success: true, ...branding });
});

// 6b. Endpoint: Update branding text fields (admin)
app.post('/api/admin/branding', async (c) => {
  const auth = c.req.header('Authorization');
  if (!isAdminAuthorized(auth)) {
    return c.json({ error: 'Akses ditolak. Tidak ada otorisasi admin.' }, 403);
  }

  const body = await c.req.json();
  const schoolName = String(body.schoolName || '').trim();
  const schoolTagline = String(body.schoolTagline || '').trim();
  const footerCopy = String(body.footerCopy || '').trim();
  const itTeamLabel = String(body.itTeamLabel || '').trim();

  if (!schoolName) {
    return c.json({ error: 'Nama sekolah wajib diisi.' }, 400);
  }

  try {
    await setConfigValue(BRANDING_CONFIG_KEYS.schoolName, schoolName);
    await setConfigValue(BRANDING_CONFIG_KEYS.schoolTagline, schoolTagline || BRANDING_DEFAULTS.schoolTagline);
    await setConfigValue(BRANDING_CONFIG_KEYS.footerCopy, footerCopy || BRANDING_DEFAULTS.footerCopy);
    await setConfigValue(BRANDING_CONFIG_KEYS.itTeamLabel, itTeamLabel);

    const branding = await getBranding();
    return c.json({ success: true, message: 'Identitas portal berhasil diperbarui.', ...branding });
  } catch (err: any) {
    return c.json({ error: `Gagal memperbarui branding: ${err.message}` }, 500);
  }
});

// 6c. Endpoint: Read portal feature settings (admin)
app.get('/api/admin/portal-settings', async (c) => {
  const auth = c.req.header('Authorization');
  if (!isAdminAuthorized(auth)) {
    return c.json({ error: 'Akses ditolak. Tidak ada otorisasi admin.' }, 403);
  }

  const portalSettings = await getPortalSettings();
  return c.json({ success: true, ...portalSettings });
});

// 6d. Endpoint: Update portal feature settings (admin)
app.post('/api/admin/portal-settings', async (c) => {
  const auth = c.req.header('Authorization');
  if (!isAdminAuthorized(auth)) {
    return c.json({ error: 'Akses ditolak. Tidak ada otorisasi admin.' }, 403);
  }

  const body = await c.req.json();

  try {
    const portalSettings = await savePortalSettings({
      classmatesVisible: typeof body.classmatesVisible === 'boolean'
        ? body.classmatesVisible
        : undefined,
    });

    return c.json({
      success: true,
      message: 'Pengaturan fitur portal berhasil disimpan.',
      ...portalSettings,
    });
  } catch (err: any) {
    return c.json({ error: `Gagal memperbarui pengaturan portal: ${err.message}` }, 500);
  }
});

// 6e. Endpoint: Upload school logo (admin)
app.post('/api/admin/branding/logo', async (c) => {
  const auth = c.req.header('Authorization');
  if (!isAdminAuthorized(auth)) {
    return c.json({ error: 'Akses ditolak. Tidak ada otorisasi admin.' }, 403);
  }

  try {
    await ensureUploadsDir();
    const body = await c.req.parseBody();
    const file = body['logo'] as File | undefined;

    if (!file || typeof file.arrayBuffer !== 'function') {
      return c.json({ error: 'File logo tidak terdeteksi dalam unggahan.' }, 400);
    }

    const originalName = sanitizeUploadFilename(file.name || 'school-logo.png');
    const ext = path.extname(originalName).toLowerCase();
    const allowedExt = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];

    if (!allowedExt.includes(ext)) {
      return c.json({ error: 'Format logo harus PNG, JPG, WEBP, atau SVG.' }, 400);
    }

    if (file.size > 2 * 1024 * 1024) {
      return c.json({ error: 'Ukuran logo maksimal 2 MB.' }, 400);
    }

    const storedName = `school-logo${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOADS_DIR, storedName), buffer);
    await setConfigValue(BRANDING_CONFIG_KEYS.logoUrl, `/uploads/${storedName}`);

    const branding = await getBranding();
    return c.json({
      success: true,
      message: 'Logo sekolah berhasil diunggah.',
      ...branding,
    });
  } catch (err: any) {
    return c.json({ error: `Gagal mengunggah logo: ${err.message}` }, 500);
  }
});

// 6. Endpoint: Configure dynamic countdown date
app.post('/api/admin/config', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== 'Bearer admin-secret-session-token') {
    return c.json({ error: 'Akses ditolak. Tidak ada otorisasi admin.' }, 403);
  }

  const { date } = await c.req.json();
  if (!date || isNaN(Date.parse(date))) {
    return c.json({ error: 'Tanggal rilis tidak valid!' }, 400);
  }

  try {
    await db
      .insert(schema.config)
      .values({ key: 'ANNOUNCEMENT_DATE', value: date })
      .onConflictDoUpdate({
        target: schema.config.key,
        set: { value: date }
      });

    return c.json({ success: true, message: 'Tanggal rilis berhasil diperbarui.' });
  } catch (err: any) {
    return c.json({ error: `Gagal memperbarui konfigurasi: ${err.message}` }, 500);
  }
});

// 7a. Endpoint: Download Excel import template (admin)
app.get('/api/admin/import/template', async (c) => {
  try {
    const auth = c.req.header('Authorization');
    if (!isAdminAuthorized(auth)) {
      return c.json({ error: 'Akses ditolak. Token admin tidak valid.' }, 403);
    }

    const buffer = buildImportTemplateBuffer();
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${IMPORT_TEMPLATE_FILENAME}"`,
      },
    });
  } catch (err: any) {
    return c.json({ error: `Gagal membuat template Excel: ${err.message}` }, 500);
  }
});

// 7b. Endpoint: Admin database import Excel sheet
app.post('/api/admin/import', async (c) => {
  try {
    const auth = c.req.header('Authorization');
    if (auth !== 'Bearer admin-secret-session-token') {
      return c.json({ error: 'Akses ditolak. Token admin tidak valid.' }, 403);
    }

    const body = await c.req.parseBody();
    const file = body['file'] as File | undefined;
    if (!file) {
      return c.json({ error: 'File Excel tidak terdeteksi dalam unggahan.' }, 400);
    }

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Parse sheet rows into raw JSON
    const rawData = xlsx.utils.sheet_to_json(worksheet) as any[];
    let importedCount = 0;

    for (const row of rawData) {
      // Direct Excel columns mapping
      const studentData = {
        urut: String(row['URUT'] || row['Urut'] || '').trim(),
        nipd: String(row['NIPD'] || row['Nipd'] || row['NIS'] || '').trim(),
        nisn: String(row['NISN'] || row['Nisn'] || '').trim(),
        nama: String(row['Nama'] || row['Nama Siswa'] || row['NAMA'] || '').trim(),
        jk: String(row['JK'] || row['Jk'] || 'L').toUpperCase().trim(),
        namawalas: String(row['namawalas'] || row['Nama Walas'] || row['Wali Kelas'] || '').trim(),
        peminatan: String(row['peminatan'] || row['Peminatan'] || '').trim(),
        kelas: String(row['KELAS'] || row['Kelas'] || '').trim(),
      };

      // Skip rows with missing NISN/NIS identifiers
      if (!studentData.nisn || !studentData.nipd) {
        continue;
      }

      // Upsert record: Insert or update if NISN already exists
      await db.insert(schema.students)
        .values(studentData)
        .onConflictDoUpdate({
          target: schema.students.nisn,
          set: studentData
        });
      
      importedCount++;
    }

    return c.json({ success: true, message: `${importedCount} data murid berhasil diimpor ke database.` });
  } catch (error: any) {
    return c.json({ error: `Gagal mengimpor data Excel: ${error.message}` }, 500);
  }
});

// 8. Endpoint: Database statistics
app.get('/api/admin/stats', async (c) => {
  try {
    const auth = c.req.header('Authorization');
    if (auth !== 'Bearer admin-secret-session-token') {
      return c.json({ error: 'Akses ditolak.' }, 403);
    }
    
    const studentsList = await db.select().from(schema.students);
    const total = studentsList.length;

    // Calculate gender count
    const boys = studentsList.filter(s => s.jk === 'L').length;
    const girls = studentsList.filter(s => s.jk === 'P').length;

    // Calculate class & peminatan distributions
    const classCountMap: Record<string, number> = {};
    const peminatanCountMap: Record<string, number> = {};
    studentsList.forEach(s => {
      if (s.kelas) {
        classCountMap[s.kelas] = (classCountMap[s.kelas] || 0) + 1;
      }
      if (s.peminatan) {
        peminatanCountMap[s.peminatan] = (peminatanCountMap[s.peminatan] || 0) + 1;
      }
    });

    return c.json({
      count: total,
      boys,
      girls,
      classes: classCountMap,
      classCount: Object.keys(classCountMap).length,
      peminatan: peminatanCountMap,
      peminatanCount: Object.keys(peminatanCountMap).length,
    });
  } catch (e) {
    return c.json({ count: 0, boys: 0, girls: 0, classes: {} });
  }
});

// 9. Endpoint: List students with pagination, search, and class filters
app.get('/api/admin/students', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== 'Bearer admin-secret-session-token') {
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  const search = c.req.query('search') || '';
  const kelas = c.req.query('kelas') || '';
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.max(1, Number(c.req.query('limit')) || 10);
  const offset = (page - 1) * limit;

  try {
    const conditions: any[] = [];
    
    if (search) {
      conditions.push(
        or(
          ilike(schema.students.nama, `%${search}%`),
          ilike(schema.students.nisn, `%${search}%`),
          ilike(schema.students.nipd, `%${search}%`)
        )
      );
    }
    
    if (kelas) {
      conditions.push(eq(schema.students.kelas, kelas));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get count
    const allStudentsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.students)
      .where(whereClause);
    
    const total = Number(allStudentsCount[0]?.count || 0);

    // Get data
    const studentsData = await db
      .select()
      .from(schema.students)
      .where(whereClause)
      .orderBy(schema.students.nama)
      .limit(limit)
      .offset(offset);

    // Get list of unique classes for filter dropdown
    const uniqueClassesResult = await db
      .select({ kelas: schema.students.kelas })
      .from(schema.students)
      .groupBy(schema.students.kelas)
      .orderBy(schema.students.kelas);
    
    const classes = uniqueClassesResult.map(r => r.kelas).filter(Boolean);

    return c.json({
      success: true,
      data: studentsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      classes
    });
  } catch (err: any) {
    return c.json({ error: `Database error: ${err.message}` }, 500);
  }
});

// 10. Endpoint: Add single student manually
app.post('/api/admin/students', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== 'Bearer admin-secret-session-token') {
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  try {
    const body = await c.req.json();
    const { urut, nipd, nisn, nama, jk, namawalas, peminatan, kelas } = body;

    if (!nipd || !nisn || !nama || !jk || !namawalas || !peminatan || !kelas) {
      return c.json({ error: 'Data tidak lengkap! Semua kolom (kecuali No Urut) wajib diisi.' }, 400);
    }

    const newStudent = {
      urut: urut ? String(urut).trim() : '',
      nipd: String(nipd).trim(),
      nisn: String(nisn).trim(),
      nama: String(nama).trim(),
      jk: String(jk).trim().toUpperCase(),
      namawalas: String(namawalas).trim(),
      peminatan: String(peminatan).trim(),
      kelas: String(kelas).trim()
    };

    // Check uniqueness of NISN
    const existing = await db.query.students.findFirst({
      where: eq(schema.students.nisn, newStudent.nisn)
    });

    if (existing) {
      return c.json({ error: `Murid dengan NISN ${newStudent.nisn} sudah terdaftar!` }, 400);
    }

    await db.insert(schema.students).values(newStudent);
    return c.json({ success: true, message: 'Murid berhasil ditambahkan.' });
  } catch (err: any) {
    return c.json({ error: `Gagal menambahkan murid: ${err.message}` }, 500);
  }
});

// 11. Endpoint: Edit single student manually
app.put('/api/admin/students/:id', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== 'Bearer admin-secret-session-token') {
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  const id = Number(c.req.param('id'));

  try {
    const body = await c.req.json();
    const { urut, nipd, nisn, nama, jk, namawalas, peminatan, kelas } = body;

    if (!nipd || !nisn || !nama || !jk || !namawalas || !peminatan || !kelas) {
      return c.json({ error: 'Data tidak lengkap! Semua kolom (kecuali No Urut) wajib diisi.' }, 400);
    }

    const updatedData = {
      urut: urut ? String(urut).trim() : '',
      nipd: String(nipd).trim(),
      nisn: String(nisn).trim(),
      nama: String(nama).trim(),
      jk: String(jk).trim().toUpperCase(),
      namawalas: String(namawalas).trim(),
      peminatan: String(peminatan).trim(),
      kelas: String(kelas).trim()
    };

    // Check if NISN is used by another student
    const existing = await db.query.students.findFirst({
      where: and(
        eq(schema.students.nisn, updatedData.nisn),
        sql`${schema.students.id} != ${id}`
      )
    });

    if (existing) {
      return c.json({ error: `Murid dengan NISN ${updatedData.nisn} sudah terdaftar pada record lain!` }, 400);
    }

    await db.update(schema.students)
      .set(updatedData)
      .where(eq(schema.students.id, id));

    return c.json({ success: true, message: 'Murid berhasil diperbarui.' });
  } catch (err: any) {
    return c.json({ error: `Gagal memperbarui data murid: ${err.message}` }, 500);
  }
});

// 12. Endpoint: Delete single student
app.delete('/api/admin/students/:id', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== 'Bearer admin-secret-session-token') {
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  const id = Number(c.req.param('id'));

  try {
    await db.delete(schema.students).where(eq(schema.students.id, id));
    return c.json({ success: true, message: 'Murid berhasil dihapus.' });
  } catch (err: any) {
    return c.json({ error: `Gagal menghapus murid: ${err.message}` }, 500);
  }
});

// 13. Endpoint: Class directory with homeroom teachers
app.get('/api/admin/classes', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== 'Bearer admin-secret-session-token') {
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  try {
    const studentsList = await db.select().from(schema.students);
    const classMap = new Map<string, {
      kelas: string;
      namawalas: string;
      peminatan: string;
      count: number;
      boys: number;
      girls: number;
    }>();

    for (const student of studentsList) {
      if (!student.kelas) continue;

      if (!classMap.has(student.kelas)) {
        classMap.set(student.kelas, {
          kelas: student.kelas,
          namawalas: student.namawalas,
          peminatan: student.peminatan,
          count: 0,
          boys: 0,
          girls: 0,
        });
      }

      const entry = classMap.get(student.kelas)!;
      entry.count += 1;
      if (student.jk === 'L') entry.boys += 1;
      else entry.girls += 1;
    }

    const data = Array.from(classMap.values()).sort((a, b) =>
      a.kelas.localeCompare(b.kelas, 'id', { numeric: true })
    );

    return c.json({ success: true, data, total: data.length });
  } catch (err: any) {
    return c.json({ error: `Database error: ${err.message}` }, 500);
  }
});

// 14. Endpoint: Peminatan (major track) summary
app.get('/api/admin/peminatan', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== 'Bearer admin-secret-session-token') {
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  try {
    const studentsList = await db.select().from(schema.students);
    const peminatanMap = new Map<string, {
      peminatan: string;
      count: number;
      boys: number;
      girls: number;
      classes: Set<string>;
    }>();

    for (const student of studentsList) {
      if (!student.peminatan) continue;

      if (!peminatanMap.has(student.peminatan)) {
        peminatanMap.set(student.peminatan, {
          peminatan: student.peminatan,
          count: 0,
          boys: 0,
          girls: 0,
          classes: new Set<string>(),
        });
      }

      const entry = peminatanMap.get(student.peminatan)!;
      entry.count += 1;
      if (student.jk === 'L') entry.boys += 1;
      else entry.girls += 1;
      if (student.kelas) entry.classes.add(student.kelas);
    }

    const data = Array.from(peminatanMap.values())
      .map((entry) => ({
        peminatan: entry.peminatan,
        count: entry.count,
        boys: entry.boys,
        girls: entry.girls,
        classCount: entry.classes.size,
        classes: Array.from(entry.classes).sort((a, b) =>
          a.localeCompare(b, 'id', { numeric: true })
        ),
      }))
      .sort((a, b) => a.peminatan.localeCompare(b.peminatan, 'id'));

    return c.json({ success: true, data, total: data.length });
  } catch (err: any) {
    return c.json({ error: `Database error: ${err.message}` }, 500);
  }
});

// 15. Endpoint: Bulk delete all students
app.delete('/api/admin/students', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth !== 'Bearer admin-secret-session-token') {
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  try {
    await db.delete(schema.students);
    return c.json({ success: true, message: 'Semua data murid berhasil dihapus dari database.' });
  } catch (err: any) {
    return c.json({ error: `Gagal membersihkan database: ${err.message}` }, 500);
  }
});

// Start Hono Node Server
const port = Number(process.env.PORT) || 3005;
ensureUploadsDir().catch((err) => {
  console.error('Failed to prepare uploads directory:', err);
});

serve({
  fetch: app.fetch,
  port: port
}, (info) => {
  console.log(`[Hono API Server] Running on http://localhost:${info.port}`);
});

export default app;

