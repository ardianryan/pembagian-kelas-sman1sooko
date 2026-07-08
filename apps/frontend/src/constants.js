const rawApiBase = import.meta.env.VITE_API_BASE ?? '';
export const API_BASE = rawApiBase.replace(/\/$/, '');
export const API_URL = API_BASE ? `${API_BASE}/api` : '/api';
export const APP_NAME = 'Pengumuman Pembagian Kelas';

export const DEFAULT_BRANDING = {
  schoolName: 'SMAN 1 Sooko',
  schoolTagline: 'Portal Informasi Sekolah',
  footerCopy: '© 2026 SMAN 1 Sooko Mojokerto. All Rights Reserved.',
  itTeamLabel: '',
  logoUrl: '/icon.png',
};

export const CLASS_TIPS = [
  'Siapkan ATK baru',
  'Review materi lalu',
  'Tetapkan target belajar',
  'Istirahat yang cukup',
  'Bangun circle belajar yang positif'
];

export const TRIVIA_DATA = [
  'Sekolah SMAN 1 Sooko didirikan dengan dedikasi tinggi untuk mencerdaskan putra-putri Kabupaten Mojokerto dan sekitarnya.',
  'Ki Hajar Dewantara, pelopor pendidikan kita, meyakini bahwa belajar bisa dilakukan di mana saja, kapan saja, dan oleh siapa saja.',
  'Tahukah kamu? Kebiasaan belajar secara konsisten 20 menit sehari jauh lebih efektif dibanding SKS (Sistem Kebut Semalam) sebelum ujian.',
  'Guru wali kelas baru kamu siap menyambut dan membimbing kamu untuk meraih potensi belajar terbaik di tahun pelajaran ini!',
  'Feynman Technique: Menjelaskan kembali pelajaran ke teman secara sederhana adalah cara terbaik menguji pemahaman kita.'
];

export const INSPIRATIONAL_QUOTES = [
  { text: 'Ing Ngarsa Sung Tulada, Ing Madya Mangun Karsa, Tut Wuri Handayani.', author: 'Ki Hajar Dewantara' },
  { text: 'Habis gelap terbitlah terang. Keadaan jelek akan berlalu.', author: 'R.A. Kartini' },
  { text: 'Pendidikan adalah senjata paling ampuh untuk mengubah dunia.', author: 'Nelson Mandela' },
  { text: 'Hanya ketakutan akan kegagalan yang membuat mimpi terasa mustahil.', author: 'Paulo Coelho' },
  { text: 'Berikan aku seribu orang tua, niscaya akan kucabut Semeru dari akarnya.', author: 'Soekarno' },
  { text: 'Jangan pernah melupakan sejarah karena sejarah adalah cermin masa depan.', author: 'Soekarno' },
  { text: 'Belajar tanpa berpikir itu tidak ada gunanya, berpikir tanpa belajar sangatlah berbahaya.', author: 'Confucius' },
  { text: 'Keberhasilan adalah milik mereka yang selalu berusaha, bukan yang selalu menunggu.', author: 'Anonim' },
  { text: 'Ilmu pengetahuan tanpa karakter adalah jalan menuju kehancuran.', author: 'Albert Einstein' },
  { text: 'Genius adalah satu persen inspirasi dan sembilan puluh sembilan persen keringat.', author: 'Thomas Edison' },
  { text: 'Kesalahan terbesar adalah berhenti belajar setelah merasa cukup pintar.', author: 'Anonim' },
  { text: 'Disiplin adalah jembatan antara tujuan dan pencapaian.', author: 'Jim Rohn' },
  { text: 'Kegagalan bukan akhir perjalanan, melainkan bagian dari proses belajar.', author: 'Anonim' },
  { text: 'Orang yang berani tidak takut gagal, orang yang takut gagal tidak pernah berani.', author: 'Anonim' },
  { text: 'Buku adalah jendela dunia. Bacalah, maka hatimu akan semakin luas.', author: 'Anonim' },
  { text: 'Tidak ada jalan pintas menuju tempat yang layak dituju.', author: 'Beverly Sills' },
  { text: 'Kerendahan hati adalah awal dari kebijaksanaan.', author: 'Socrates' },
  { text: 'Masa depan milik mereka yang percaya pada keindahan mimpi mereka.', author: 'Eleanor Roosevelt' },
  { text: 'Jangan bandingkan awalmu dengan awal orang lain. Bandingkan dirimu hari ini dengan dirimu kemarin.', author: 'Anonim' },
  { text: 'Satu buku yang dibaca di usia muda setara dengan teman seumur hidup.', author: 'Anonim' },
  { text: 'Belajar itu seperti mendaki gunung: langkah kecil yang konsisten akan sampai ke puncak.', author: 'Anonim' },
  { text: 'Kemampuan terbesar manusia adalah kemampuan untuk berubah menjadi lebih baik.', author: 'Anonim' },
  { text: 'Keberanian bukan berarti tidak takut, tetapi tetap melangkah meski takut.', author: 'Nelson Mandela' },
  { text: 'Kesuksesan bukan akhir, kegagalan bukan fatal. Yang penting adalah keberanian untuk melanjutkan.', author: 'Winston Churchill' },
  { text: 'Jadilah perubahan yang ingin kamu lihat di dunia.', author: 'Mahatma Gandhi' },
  { text: 'Waktu terbaik untuk menanam pohon adalah dua puluh tahun lalu. Waktu terbaik kedua adalah sekarang.', author: 'Pepatah Tiongkok' },
  { text: 'Rajin pangkal pandai, malas pangkal bodoh.', author: 'Pepatah Melayu' },
  { text: 'Guru yang baik memberi inspirasi, bukan hanya informasi.', author: 'Anonim' },
  { text: 'Setiap hari adalah kesempatan baru untuk menjadi versi terbaik dirimu.', author: 'Anonim' },
  { text: 'Fokus pada proses, hasil akan mengikuti dengan sendirinya.', author: 'Anonim' },
  { text: 'Kolaborasi membuat kita lebih kuat daripada berjuang sendirian.', author: 'Anonim' },
  { text: 'Kejujuran dalam belajar dimulai dari keberanian mengakui belum paham.', author: 'Anonim' },
  { text: 'Semangat belajar yang konsisten mengalahkan bakat yang tidak diasah.', author: 'Anonim' },
  { text: 'Kelas baru adalah panggung baru. Tampilkan yang terbaik dari dirimu.', author: 'Anonim' },
  { text: 'Ilmu yang bermanfaat adalah ilmu yang dibagikan dan diamalkan.', author: 'Anonim' },
  { text: 'Hari ini belajar sedikit, besok akan terasa lebih siap menghadapi tantangan.', author: 'Anonim' },
];

export function getQuoteForStudent(student) {
  if (!student) return INSPIRATIONAL_QUOTES[0];

  if (typeof student.quoteIndex === 'number') {
    const index = ((student.quoteIndex % INSPIRATIONAL_QUOTES.length) + INSPIRATIONAL_QUOTES.length) % INSPIRATIONAL_QUOTES.length;
    return INSPIRATIONAL_QUOTES[index];
  }

  const seed = `${student.nisn || ''}:${student.nipd || ''}:${student.id || 0}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return INSPIRATIONAL_QUOTES[hash % INSPIRATIONAL_QUOTES.length];
}