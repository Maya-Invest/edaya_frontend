import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import {
	STUDENT_HEADERS,
	STUDENTS_HAPPY,
	studentToRow,
} from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Eleves');

write('EL02-partial-import.xlsx', STUDENT_HEADERS, [
	studentToRow(STUDENTS_HAPPY[0]!),
	studentToRow(STUDENTS_HAPPY[1]!),
	['', 'Koné', 'CI-2025-099', '6eme A', '2013-01-01', 'F'],
	['Kouamé', 'N\'Dri', 'CI-2025-100', '6eme Z', '2013-02-02', 'M'],
	['Aya', 'Sanogo', 'CI-2025-101', '5eme A', '31/12/2013', 'F'],
]);

write('EL03-error-missing-required.xlsx', STUDENT_HEADERS, [
	['', 'Koné', 'CI-2025-110', '6eme A', '2013-01-01', 'F'],
	['Kouadio', '', 'CI-2025-111', '6eme A', '2013-01-01', 'M'],
	['Aminata', 'Koné', '', '6eme A', '2013-01-01', 'F'],
]);

write('EL04-error-invalid-date.xlsx', STUDENT_HEADERS, [
	['Kouamé', 'N\'Dri', 'CI-2025-120', '6eme A', '15/03/2013', 'M'],
	['Affoué', 'Yéo', 'CI-2025-121', '6eme B', '2013-13-40', 'F'],
]);

write('EL05-error-class-not-found.xlsx', STUDENT_HEADERS, [
	['Seydou', 'Diabaté', 'CI-2025-130', '6eme Z', '2012-03-18', 'M'],
	['Mariam', 'Ouattara', 'CI-2025-131', 'Terminale A', '2013-09-08', 'F'],
]);

write('EL06-error-duplicate-in-file.xlsx', STUDENT_HEADERS, [
	studentToRow(STUDENTS_HAPPY[2]!),
	studentToRow(STUDENTS_HAPPY[2]!),
	studentToRow(STUDENTS_HAPPY[3]!),
]);

write('EL07-error-duplicate-existing.xlsx', STUDENT_HEADERS, [
	studentToRow(STUDENTS_HAPPY[0]!),
	['Yao', 'Kouadio', 'CI-2025-140', '6eme B', '2013-04-12', 'M'],
]);

write('EL08-no-class-optional.xlsx', STUDENT_HEADERS, [
	['Bakary', 'Silué', 'CI-2025-150', '', '2013-05-10', 'M'],
	['Maimouna', 'Doumbia', 'CI-2025-151', '', '2013-07-19', 'F'],
]);

write('EL09-headers-only.xlsx', STUDENT_HEADERS, []);

write('EL10-trim-and-case.xlsx', STUDENT_HEADERS, [
	['  Bakary  ', '  Silué  ', '  CI-2025-160  ', '  6eme D  ', '  2013-05-10  ', '  M  '],
	['fatou', 'diallo', 'ci-2025-161', '6eme e', '2013-06-11', 'f'],
]);

write('EL01-happy-all-valid.xlsx', STUDENT_HEADERS, STUDENTS_HAPPY.map(studentToRow));

console.log(`Generated student import fixtures in ${join(here, 'xlsx')}`);
