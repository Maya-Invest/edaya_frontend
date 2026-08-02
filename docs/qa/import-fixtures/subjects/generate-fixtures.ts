import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import {
	loadSchoolImportSnapshot,
	primaryNiveau,
	requireGradeLevels,
	secondaryNiveau,
} from '../_shared/school-db.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Matieres');
const HEADERS = ['nom', 'niveau', 'abbreviation', 'coefficient'] as const;

const snapshot = await loadSchoolImportSnapshot();
const levels = requireGradeLevels(snapshot);
const niveau = primaryNiveau(snapshot);
const niveau2 = secondaryNiveau(snapshot);

/** Catalogue existant (niveaux qui ont déjà des classes) — base du happy path. */
const levelsWithClasses = new Set(snapshot.classes.map(entry => entry.niveau));
const subjectsHappy = snapshot.subjectsAtLevel.filter(entry => levelsWithClasses.has(entry.niveau));
const subjectRows = (subjectsHappy.length > 0 ? subjectsHappy : snapshot.subjectsAtLevel).map(
	entry => [entry.matiere, entry.niveau, entry.code ?? '', entry.coefficient ?? 1] as const,
);

if (subjectRows.length === 0) {
	throw new Error('No grade_level_subjects in local school DB — apply an onboarding structure first.');
}

const sample = subjectRows[0]!;
const sample2 = subjectRows[1] ?? subjectRows[0]!;

write('SU02-partial-import.xlsx', HEADERS, [
	[...sample],
	[...sample2],
	['', niveau, 'VIDE', 1],
	['Latin', '7eme Z', 'LAT', 1],
	['Français', niveau, 'FR', 'abc'],
]);

write('SU03-error-unknown-niveau.xlsx', HEADERS, [
	['Mathématiques', '7eme Z', 'MATH', 3],
	['Français', 'Terminale X', 'FR', 3],
]);

write('SU04-error-missing-required.xlsx', HEADERS, [
	['', niveau, 'MATH', 3],
	['Français', '', 'FR', 3],
]);

write('SU05-error-invalid-coefficient.xlsx', HEADERS, [
	['Mathématiques', niveau, 'MATH', 'trois'],
	['Français', niveau, 'FR', -1],
	['Anglais', niveau, 'ANG', 0],
]);

write('SU06-error-duplicate-in-file.xlsx', HEADERS, [
	[...sample],
	[...sample],
	[...sample2],
]);

const niveauWithoutClasses = levels.find(level => !levelsWithClasses.has(level.name))?.name
	?? 'Seconde Z';
write('SU07-error-no-classes-for-level.xlsx', HEADERS, [
	['Arts plastiques', niveauWithoutClasses, 'ART', 1],
]);

write('SU08-headers-only.xlsx', HEADERS, []);

write('SU09-trim-and-case.xlsx', HEADERS, [
	[`  ${sample[0]}  `, `  ${sample[1]}  `, `  ${sample[2]}  `, `  ${sample[3]}  `],
	[String(sample2[0]).toLowerCase(), niveau2, String(sample2[2]).toLowerCase(), sample2[3]],
]);

write('SU01-happy-all-valid.xlsx', HEADERS, subjectRows.map(row => [...row]));

console.log(`Generated subject import fixtures in ${join(here, 'xlsx')}`);
console.log(`SU01: ${subjectRows.length} matières×niveaux depuis grade_level_subjects`);
