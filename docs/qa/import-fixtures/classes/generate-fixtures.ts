/**
 * Generates Excel fixtures for manual class import QA.
 * Run: bun docs/qa/import-fixtures/classes/generate-fixtures.ts
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import {
	loadSchoolImportSnapshot,
	primaryClass,
	primaryNiveau,
	requireClasses,
	requireGradeLevels,
	unknownClassName,
} from '../_shared/school-db.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Classes');
const HEADERS = ['nom', 'niveau', 'capacite'] as const;

const snapshot = await loadSchoolImportSnapshot();
const levels = requireGradeLevels(snapshot);
const classes = requireClasses(snapshot);
const niveau = primaryNiveau(snapshot);
const existing = primaryClass(snapshot);
const unknownNiveau = 'Niveau Inconnu QA';

/** Nouvelles classes (sections absentes) — une par niveau, pour import nominal sans collision. */
const newClassRows = levels.map((level, index) => {
	const existingNames = new Set(
		classes.filter(entry => entry.niveau === level.name).map(entry => entry.name.toLowerCase()),
	);
	const letters = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';
	let nom = `${level.name} B`;
	for (const letter of letters) {
		const candidate = `${level.name.replace(/ème$/i, 'e').replace(/ê/g, 'e')} ${letter}`;
		// Prefer school naming style from an existing class on this level when available.
		const sibling = classes.find(entry => entry.niveau === level.name);
		const styled = sibling
			? sibling.name.replace(/\s+[A-Za-zÀ-ÿ]+$/u, ` ${letter}`)
			: candidate;
		if (!existingNames.has(styled.toLowerCase())) {
			nom = styled;
			break;
		}
	}
	return [nom, level.name, 30 + (index % 6)] as [string, string, number];
});

write('CL02-partial-import.xlsx', HEADERS, [
	newClassRows[0] ?? [`${niveau} J`, niveau, 25],
	newClassRows[1] ?? [`${levels[1]?.name ?? niveau} F`, levels[1]?.name ?? niveau, 25],
	['', niveau, 25],
	[unknownClassName(snapshot), unknownNiveau, 25],
]);

write('CL03-error-unknown-niveau.xlsx', HEADERS, [
	[`${niveau} J`, unknownNiveau, 30],
	[`${niveau} K`, 'Terminale X', 30],
]);

write('CL04-error-missing-required.xlsx', HEADERS, [
	['', niveau, 30],
	[`${niveau} J`, '', 30],
	['', '', ''],
]);

write('CL05-error-invalid-capacity.xlsx', HEADERS, [
	[`${niveau} J`, niveau, 'abc'],
	[`${niveau} K`, niveau, -5],
	[`${niveau} L`, niveau, 0],
]);

write('CL06-error-duplicate-in-file.xlsx', HEADERS, [
	newClassRows[0] ?? [`${niveau} J`, niveau, 30],
	[
		(newClassRows[0] ?? [`${niveau} J`, niveau, 30])[0],
		(newClassRows[0] ?? [`${niveau} J`, niveau, 30])[1],
		35,
	],
	newClassRows[1] ?? [`${levels[1]?.name ?? niveau} F`, levels[1]?.name ?? niveau, 30],
]);

write('CL07-error-duplicate-existing.xlsx', HEADERS, [
	[existing.name, existing.niveau, existing.capacity ?? 30],
	newClassRows[0] ?? [`${niveau} J`, niveau, 30],
]);

write('CL08-headers-only.xlsx', HEADERS, []);

write('CL09-trim-and-case.xlsx', HEADERS, [
	[`  ${(newClassRows[0] ?? [`${niveau} K`, niveau, 40])[0]}  `, `  ${niveau}  `, '  40  '],
	newClassRows[1] ?? [`${niveau} L`, niveau, 35],
]);

write('CL01-happy-all-valid.xlsx', HEADERS, newClassRows);

console.log(`Generated class import fixtures in ${join(here, 'xlsx')}`);
console.log(`CL01: ${newClassRows.length} nouvelles classes (niveaux DB: ${levels.map(l => l.name).join(', ')})`);
