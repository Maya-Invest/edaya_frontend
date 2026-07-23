import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { GUARDIAN_HEADERS, PHONES } from '../_shared/ivory-coast-data.ts';
import { resolveStudentMatricules } from '../_shared/fixture-pool.ts';
import { loadSchoolImportSnapshot } from '../_shared/school-db.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Tuteurs');
const HEADERS = GUARDIAN_HEADERS;

const snapshot = await loadSchoolImportSnapshot();
const matricules = resolveStudentMatricules(snapshot, 12);
const m = (index: number) => matricules[index % matricules.length]!;

write('TU02-partial-import.xlsx', HEADERS, [
	['TUT-001', 'Aminata', 'Koné', m(0), 'aminata.kone@example.ci', PHONES.aminata],
	['TUT-002', 'Kouadio', 'Yao', `${m(1)};CI-2025-999`, 'kouadio.yao@example.ci', PHONES.kouadio],
	['TUT-003', '', 'Traoré', m(2), 'traore@example.ci', PHONES.traore],
]);

write('TU03-error-missing-required.xlsx', HEADERS, [
	['', 'Aminata', 'Koné', m(0), 'aminata@example.ci', PHONES.aminata],
	['TUT-010', '', 'Koné', m(0), 'aminata2@example.ci', PHONES.aminata],
	['TUT-011', 'Kouadio', '', m(1), 'yao@example.ci', PHONES.kouadio],
	['TUT-012', 'Ibrahim', 'Traoré', '', 'traore@example.ci', PHONES.traore],
]);

write('TU04-error-student-not-found.xlsx', HEADERS, [
	['TUT-020', 'Fatou', 'Diallo', 'CI-2025-999', 'fatou@example.ci', '+225 07 11 22 33 44'],
	['TUT-021', 'Moussa', 'Cissé', 'CI-2025-998;CI-2025-997', 'moussa@example.ci', '+225 05 55 66 77 88'],
]);

write('TU05-multi-matricule-siblings.xlsx', HEADERS, [
	['TUT-030', 'Affoué', 'Yéo', `${m(0)};${m(1)}`, 'affoue.yeo@example.ci', '+225 07 90 12 34 56'],
]);

write('TU06-error-duplicate-in-file.xlsx', HEADERS, [
	['TUT-040', 'Aminata', 'Koné', m(3), 'aminata.tuteur@example.ci', PHONES.aminata],
	['tut-040', 'Aminata', 'Koné', m(3), 'aminata.tuteur2@example.ci', PHONES.aminata],
	['TUT-041', 'Kouadio', 'Yao', m(4), 'yao@example.ci', PHONES.kouadio],
]);

write('TU07-headers-only.xlsx', HEADERS, []);

write('TU08-trim-and-case.xlsx', HEADERS, [
	['  TUT-050  ', '  Aminata  ', '  Koné  ', `  ${m(5)}  `, '  aminata@example.ci  ', `  ${PHONES.aminata}  `],
]);

write('TU09-multi-matricule-ampersand.xlsx', HEADERS, [
	['TUT-060', 'Affoué', 'Yéo', `${m(0)}&${m(1)}`, 'affoue.yeo@example.ci', '+225 07 90 12 34 56'],
]);

const guardianNames = [
	['Aminata', 'Koné'],
	['Kouadio', 'Yao'],
	["N'Guessan", 'Kouassi'],
	['Adjoua', 'Bamba'],
	['Ibrahim', 'Traoré'],
	['Mariam', 'Ouattara'],
	['Seydou', 'Diabaté'],
	['Akissi', 'Assouan'],
] as const;

write('TU01-happy-all-valid.xlsx', HEADERS, guardianNames.map((names, index) => [
	`TUT-${String(index + 1).padStart(3, '0')}`,
	names[0],
	names[1],
	m(index),
	`${names[0].toLowerCase().replace(/[^a-z]/g, '')}.${names[1].toLowerCase().replace(/[^a-z]/g, '')}.tuteur@example.ci`,
	index % 2 === 0 ? PHONES.aminata : PHONES.kouadio,
]));

console.log(`Generated guardian import fixtures in ${join(here, 'xlsx')}`);
console.log(`TU01: ${guardianNames.length} tuteurs liés aux matricules ${matricules.slice(0, 8).join(', ')}`);
