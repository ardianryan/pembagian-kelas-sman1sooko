const xlsx = require('xlsx');
const pg = require('pg');
const dotenv = require('dotenv');

// Load environment variables from backend .env
dotenv.config({ path: 'apps/backend/.env' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Seed announcement config to a past date to release the countdown gate
    await client.query(`
      INSERT INTO config (key, value, updated_at)
      VALUES ('ANNOUNCEMENT_DATE', '2026-07-01T08:00:00.000Z', NOW())
      ON CONFLICT (key) DO UPDATE SET value = '2026-07-01T08:00:00.000Z', updated_at = NOW();
    `);
    console.log("[Seeder] Config: ANNOUNCEMENT_DATE successfully set to past (Released).");

    // 2. Read test_students.xlsx and parse rows
    const workbook = xlsx.readFile('test_students.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    for (const row of rawData) {
      const student = {
        urut: String(row['URUT'] || ''),
        nipd: String(row['NIPD'] || ''),
        nisn: String(row['NISN'] || ''),
        nama: String(row['Nama'] || ''),
        jk: String(row['JK'] || 'L').toUpperCase().trim(),
        namawalas: String(row['namawalas'] || ''),
        peminatan: String(row['peminatan'] || ''),
        kelas: String(row['KELAS'] || '')
      };

      // Perform upsert based on unique constraint (nisn)
      await client.query(`
        INSERT INTO students (urut, nipd, nisn, nama, jk, namawalas, peminatan, kelas, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (nisn) DO UPDATE SET
          urut = EXCLUDED.urut,
          nipd = EXCLUDED.nipd,
          nama = EXCLUDED.nama,
          jk = EXCLUDED.jk,
          namawalas = EXCLUDED.namawalas,
          peminatan = EXCLUDED.peminatan,
          kelas = EXCLUDED.kelas;
      `, [student.urut, student.nipd, student.nisn, student.nama, student.jk, student.namawalas, student.peminatan, student.kelas]);
    }
    console.log(`[Seeder] Successfully imported ${rawData.length} student records from test_students.xlsx!`);
  } catch (err) {
    console.error("[Seeder] Error during database insertion:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
