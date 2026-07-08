const xlsx = require('xlsx');

const data = [
  {
    "URUT": 1,
    "NIPD": "17662",
    "NISN": "0101507582",
    "Nama": "AGRA MUSYAFFA HANANDA PRASETYO",
    "JK": "L",
    "namawalas": "IKA FATMA ZURIANA, S.Pd",
    "peminatan": "PEMINATAN 1",
    "KELAS": "KELAS XI-1"
  },
  {
    "URUT": 2,
    "NIPD": "17663",
    "NISN": "0097023502",
    "Nama": "AHMAD AGUSTIAN FAHRU",
    "JK": "L",
    "namawalas": "IKA FATMA ZURIANA, S.Pd",
    "peminatan": "PEMINATAN 1",
    "KELAS": "KELAS XI-1"
  },
  {
    "URUT": 3,
    "NIPD": "17672",
    "NISN": "0101954507",
    "Nama": "Ahmida Nabyla",
    "JK": "P",
    "namawalas": "IKA FATMA ZURIANA, S.Pd",
    "peminatan": "PEMINATAN 1",
    "KELAS": "KELAS XI-1"
  },
  {
    "URUT": 4,
    "NIPD": "17675",
    "NISN": "0091464459",
    "Nama": "AISYAH PUTRI ALKHALIFI",
    "JK": "P",
    "namawalas": "IKA FATMA ZURIANA, S.Pd",
    "peminatan": "PEMINATAN 1",
    "KELAS": "KELAS XI-1"
  },
  {
    "URUT": 5,
    "NIPD": "17685",
    "NISN": "0107998926",
    "Nama": "ALIF IKHSAN PERMANA",
    "JK": "L",
    "namawalas": "IKA FATMA ZURIANA, S.Pd",
    "peminatan": "PEMINATAN 1",
    "KELAS": "KELAS XI-1"
  },
  {
    "URUT": 6,
    "NIPD": "17686",
    "NISN": "0105049065",
    "Nama": "ALIFIA MAULIDA ROHMAH",
    "JK": "P",
    "namawalas": "IKA FATMA ZURIANA, S.Pd",
    "peminatan": "PEMINATAN 1",
    "KELAS": "KELAS XI-1"
  }
];

const worksheet = xlsx.utils.json_to_sheet(data);
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, "Siswa");
xlsx.writeFile(workbook, "test_students.xlsx");
console.log("File test_students.xlsx berhasil dibuat!");
