export const QUOTE_COUNT = 36;

type Classmate = {
  id: number;
  urut?: string | null;
  nipd: string;
  nisn: string;
  kelas?: string;
};

function hashClassName(kelas: string): number {
  let hash = 0;
  for (let i = 0; i < kelas.length; i += 1) {
    hash = (hash * 31 + kelas.charCodeAt(i)) >>> 0;
  }
  return hash % QUOTE_COUNT;
}

function hashStudentFallback(student: Classmate): number {
  const seed = `${student.nisn}:${student.nipd}:${student.id}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % QUOTE_COUNT;
}

export function sortClassmates(students: Classmate[]): Classmate[] {
  return [...students].sort((a, b) => {
    const urutA = parseInt(String(a.urut || '0'), 10) || 0;
    const urutB = parseInt(String(b.urut || '0'), 10) || 0;
    if (urutA !== urutB) return urutA - urutB;

    const nipdCmp = String(a.nipd).localeCompare(String(b.nipd), 'id');
    if (nipdCmp !== 0) return nipdCmp;

    return String(a.nisn).localeCompare(String(b.nisn), 'id');
  });
}

export function getQuoteIndexForStudent(student: Classmate, classStudents: Classmate[]): number {
  if (!classStudents.length) return hashStudentFallback(student);

  const sorted = sortClassmates(classStudents);
  const position = sorted.findIndex((s) => s.id === student.id);
  if (position < 0) return hashStudentFallback(student);

  const offset = hashClassName(student.kelas || classStudents[0]?.kelas || '');
  return (position + offset) % QUOTE_COUNT;
}