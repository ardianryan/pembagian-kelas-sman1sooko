type ClassmateRecord = {
  id: number;
  urut?: string | null;
  nipd: string;
  nisn: string;
  nama: string;
  jk: string;
};

function sortClassmateRecords(students: ClassmateRecord[]) {
  return [...students].sort((a, b) => {
    const urutA = parseInt(String(a.urut || '0'), 10) || 0;
    const urutB = parseInt(String(b.urut || '0'), 10) || 0;
    if (urutA !== urutB) return urutA - urutB;

    const nipdCmp = String(a.nipd).localeCompare(String(b.nipd), 'id');
    if (nipdCmp !== 0) return nipdCmp;

    return String(a.nisn).localeCompare(String(b.nisn), 'id');
  });
}

export function mapClassmatesForStudent(
  student: { id: number },
  classStudents: ClassmateRecord[]
) {
  return sortClassmateRecords(classStudents).map((classmate, index) => ({
    no: index + 1,
    nama: classmate.nama,
    jk: classmate.jk,
    isSelf: classmate.id === student.id,
  }));
}