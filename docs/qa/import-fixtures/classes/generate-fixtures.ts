/**
 * Generates Excel fixtures for manual class import QA.
 * Run: bun docs/qa/import-fixtures/classes/generate-fixtures.ts
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { nextFreeClassNames } from '../_shared/class-naming.ts';
import {
	loadSchoolImportSnapshot,
	primaryClass,
	primaryNiveau,
	requireGradeLevels,
	unknownClassName,
	unknownNiveauNames,
} from '../_shared/school-db.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Classes');
const HEADERS = ['nom', 'niveau', 'capacite'] as const;

const snapshot = await loadSchoolImportSnapshot();
const levels = requireGradeLevels(snapshot);
const niveau = primaryNiveau(snapshot);
const existing = primaryClass(snapshot);
const [unknownNiveau, otherUnknownNiveau] = unknownNiveauNames(snapshot, 2) as [string, string];

/** Nouvelles classes (sections absentes) — une par niveau, pour import nominal sans collision. */
const newClassRows = levels.map((level, index) => {
	const [nom] = nextFreeClassNames(snapshot, level, 1);
	return [nom!, level.name, 30 + (index % 6)] as [string, string, number];
});

/** Sections libres supplémentaires du niveau principal, pour les fichiers d'erreur. */
const spareNames = nextFreeClassNames(snapshot, levels[0]!, 4).slice(1);

write('CL02-partial-import.xlsx', HEADERS, [
	newClassRows[0]!,
	newClassRows[1] ?? [spareNames[0]!, niveau, 25],
	['', niveau, 25],
	[unknownClassName(snapshot), unknownNiveau, 25],
]);

write('CL03-error-unknown-niveau.xlsx', HEADERS, [
	[spareNames[0]!, unknownNiveau, 30],
	[spareNames[1]!, otherUnknownNiveau, 30],
]);

write('CL04-error-missing-required.xlsx', HEADERS, [
	['', niveau, 30],
	[spareNames[0]!, '', 30],
	['', '', ''],
]);

write('CL05-error-invalid-capacity.xlsx', HEADERS, [
	[spareNames[0]!, niveau, 'abc'],
	[spareNames[1]!, niveau, -5],
	[spareNames[2]!, niveau, 0],
]);

write('CL06-error-duplicate-in-file.xlsx', HEADERS, [
	newClassRows[0]!,
	[newClassRows[0]![0], newClassRows[0]![1], 35],
	newClassRows[1] ?? [spareNames[0]!, niveau, 30],
]);

write('CL07-error-duplicate-existing.xlsx', HEADERS, [
	[existing.name, existing.niveau, existing.capacity ?? 30],
	newClassRows[0]!,
]);

write('CL08-headers-only.xlsx', HEADERS, []);

write('CL09-trim-and-case.xlsx', HEADERS, [
	[`  ${newClassRows[0]![0]}  `, `  ${niveau}  `, '  40  '],
	newClassRows[1] ?? [spareNames[1]!, niveau, 35],
]);

write('CL01-happy-all-valid.xlsx', HEADERS, newClassRows);

console.log(`Generated class import fixtures in ${join(here, 'xlsx')}`);
console.log(`CL01: ${newClassRows.length} nouvelles classes (niveaux DB: ${levels.map(l => l.name).join(', ')})`);
