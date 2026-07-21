import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { SUBJECTS_CINQUIEME, SUBJECTS_SIXIEME } from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Matieres');

const HEADERS = ['nom', 'niveau', 'abbreviation', 'coefficient'] as const;

const subjectRow = (s: { nom: string; niveau: string; code: string; coefficient: number }) =>
	[s.nom, s.niveau, s.code, s.coefficient] as const;

write('SU02-partial-import.xlsx', HEADERS, [
	subjectRow(SUBJECTS_SIXIEME[0]!),
	subjectRow(SUBJECTS_SIXIEME[1]!),
	['', '6ème', 'VIDE', 1],
	['Latin', '7ème Z', 'LAT', 1],
	['Français', '6ème', 'FR', 'abc'],
]);

write('SU03-error-unknown-niveau.xlsx', HEADERS, [
	['Mathématiques', '7ème Z', 'MATH', 3],
	['Français', 'Terminale X', 'FR', 3],
]);

write('SU04-error-missing-required.xlsx', HEADERS, [
	['', '6ème', 'MATH', 3],
	['Français', '', 'FR', 3],
]);

write('SU05-error-invalid-coefficient.xlsx', HEADERS, [
	['Mathématiques', '6ème', 'MATH', 'trois'],
	['Français', '6ème', 'FR', -1],
	['Anglais', '6ème', 'ANG', 0],
]);

write('SU06-error-duplicate-in-file.xlsx', HEADERS, [
	subjectRow(SUBJECTS_SIXIEME[0]!),
	subjectRow(SUBJECTS_SIXIEME[0]!),
	subjectRow(SUBJECTS_SIXIEME[2]!),
]);

write('SU07-error-no-classes-for-level.xlsx', HEADERS, [
	['Arts plastiques', '2nde', 'ART', 1],
]);

write('SU08-headers-only.xlsx', HEADERS, []);

write('SU09-trim-and-case.xlsx', HEADERS, [
	['  Mathématiques  ', '  6ème  ', '  MATH  ', '  3  '],
	['français', '6ème', 'fr', 3],
]);

write('SU01-happy-all-valid.xlsx', HEADERS, [
	...SUBJECTS_SIXIEME.map(subjectRow),
	...SUBJECTS_CINQUIEME.map(subjectRow),
]);

console.log(`Generated subject import fixtures in ${join(here, 'xlsx')}`);
