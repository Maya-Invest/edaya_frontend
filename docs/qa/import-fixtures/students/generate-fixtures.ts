import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { STUDENT_HEADERS, studentToRow } from '../_shared/ivory-coast-data.ts';
import { buildImportStudents } from '../_shared/fixture-pool.ts';
import {
	loadSchoolImportSnapshot,
	primaryClass,
	requireClasses,
	unknownClassNames,
} from '../_shared/school-db.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Eleves');

const snapshot = await loadSchoolImportSnapshot();
const classes = requireClasses(snapshot);
const students = buildImportStudents(snapshot, Math.max(12, classes.length));
const primary = primaryClass(snapshot);
const secondary = classes[1] ?? primary;
const [unknown, otherUnknown] = unknownClassNames(snapshot, 2) as [string, string];

write('EL02-partial-import.xlsx', STUDENT_HEADERS, [
	studentToRow(students[0]!),
	studentToRow(students[1]!),
	['', 'Koné', 'CI-2025-099', primary.name, '2013-01-01', 'F'],
	['Kouamé', "N'Dri", 'CI-2025-100', unknown, '2013-02-02', 'M'],
	['Aya', 'Sanogo', 'CI-2025-101', secondary.name, '31/12/2013', 'F'],
]);

write('EL03-error-missing-required.xlsx', STUDENT_HEADERS, [
	['', 'Koné', 'CI-2025-110', primary.name, '2013-01-01', 'F'],
	['Kouadio', '', 'CI-2025-111', primary.name, '2013-01-01', 'M'],
	['Aminata', 'Koné', '', primary.name, '2013-01-01', 'F'],
]);

write('EL04-error-invalid-date.xlsx', STUDENT_HEADERS, [
	['Kouamé', "N'Dri", 'CI-2025-120', primary.name, '15/03/2013', 'M'],
	['Affoué', 'Yéo', 'CI-2025-121', secondary.name, '2013-13-40', 'F'],
]);

write('EL05-error-class-not-found.xlsx', STUDENT_HEADERS, [
	['Seydou', 'Diabaté', 'CI-2025-130', unknown, '2012-03-18', 'M'],
	['Mariam', 'Ouattara', 'CI-2025-131', otherUnknown, '2013-09-08', 'F'],
]);

write('EL06-error-duplicate-in-file.xlsx', STUDENT_HEADERS, [
	studentToRow(students[2]!),
	studentToRow(students[2]!),
	studentToRow(students[3]!),
]);

write('EL07-error-duplicate-existing.xlsx', STUDENT_HEADERS, [
	studentToRow(students[0]!),
	['Yao', 'Kouadio', 'CI-2025-140', secondary.name, '2013-04-12', 'M'],
]);

write('EL08-no-class-optional.xlsx', STUDENT_HEADERS, [
	['Bakary', 'Silué', 'CI-2025-150', '', '2013-05-10', 'M'],
	['Maimouna', 'Doumbia', 'CI-2025-151', '', '2013-07-19', 'F'],
]);

write('EL09-headers-only.xlsx', STUDENT_HEADERS, []);

write('EL10-trim-and-case.xlsx', STUDENT_HEADERS, [
	['  Bakary  ', '  Silué  ', '  CI-2025-160  ', `  ${primary.name}  `, '  2013-05-10  ', '  M  '],
	['fatou', 'diallo', 'ci-2025-161', secondary.name.toLowerCase(), '2013-06-11', 'f'],
]);

write('EL01-happy-all-valid.xlsx', STUDENT_HEADERS, students.map(studentToRow));

console.log(`Generated student import fixtures in ${join(here, 'xlsx')}`);
console.log(`EL01: ${students.length} élèves répartis sur ${classes.length} classes DB`);
