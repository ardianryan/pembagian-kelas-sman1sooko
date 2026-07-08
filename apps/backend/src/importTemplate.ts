import * as xlsx from 'xlsx';

const HEADERS = ['URUT', 'NIPD', 'NISN', 'Nama', 'JK', 'namawalas', 'peminatan', 'KELAS'] as const;

const EXAMPLE_ROW = [
  1,
  '17662',
  '0101507582',
  'AGRA MUSYAFFA HANANDA PRASETYO',
  'L',
  'IKA FATMA ZURIANA, S.Pd',
  'PEMINATAN 1',
  'KELAS XI-1',
];

const GUIDE_ROWS = [
  ['Kolom', 'Wajib', 'Format', 'Keterangan'],
  ['URUT', 'Opsional', 'Angka', 'Nomor urut absensi murid'],
  ['NIPD', 'Wajib', 'Teks', 'Nomor Induk Peserta Didik sekolah'],
  ['NISN', 'Wajib', '10 digit (teks)', 'NISN nasional, harus unik. Format kolom sebagai Teks agar angka nol di depan tidak hilang'],
  ['Nama', 'Wajib', 'Teks', 'Nama lengkap murid'],
  ['JK', 'Wajib', 'L atau P', 'Jenis kelamin: L = Laki-laki, P = Perempuan'],
  ['namawalas', 'Wajib', 'Teks', 'Nama guru wali kelas'],
  ['peminatan', 'Wajib', 'Teks', 'Program peminatan murid'],
  ['KELAS', 'Wajib', 'Teks', 'Nama kelas baru, contoh: KELAS XI-1'],
];

function setTextColumns(sheet: xlsx.WorkSheet, textColumnIndexes: number[], rowCount: number) {
  for (let row = 2; row <= rowCount; row += 1) {
    textColumnIndexes.forEach((colIndex) => {
      const cellAddress = xlsx.utils.encode_cell({ r: row - 1, c: colIndex });
      const cell = sheet[cellAddress];
      if (cell) {
        cell.t = 's';
        cell.z = '@';
      }
    });
  }
}

export function buildImportTemplateBuffer(): Buffer {
  const workbook = xlsx.utils.book_new();

  const dataSheet = xlsx.utils.aoa_to_sheet([[...HEADERS], EXAMPLE_ROW]);
  dataSheet['!cols'] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 14 },
    { wch: 36 },
    { wch: 4 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
  ];
  setTextColumns(dataSheet, [1, 2], 2);
  xlsx.utils.book_append_sheet(workbook, dataSheet, 'Data Murid');

  const guideSheet = xlsx.utils.aoa_to_sheet(GUIDE_ROWS);
  guideSheet['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 62 },
  ];
  xlsx.utils.book_append_sheet(workbook, guideSheet, 'Panduan');

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export const IMPORT_TEMPLATE_FILENAME = 'template-impor-murid-sman1sooko.xlsx';