/**
 * Generates Excel fixtures for manual class import QA.
 * Run: bun edaya_web/docs/qa/import-fixtures/classes/generate-fixtures.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '../../../../apps/webapp/package.json'));
const XLSX = require('xlsx') as typeof import('xlsx');

const outDir = join(here, 'xlsx');

const HEADERS = ['nom', 'niveau', 'capacite'] as const;

type Row = [string, string, string | number];

function writeFixture(filename: string, rows: Row[]) {
	const workbook = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
	XLSX.utils.book_append_sheet(workbook, sheet, 'Classes');
	const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
	const target = join(outDir, filename);
	try {
		writeFileSync(target, buffer);
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === 'EBUSY' || code === 'EPERM') {
			console.warn(`Skipped ${filename} (file open elsewhere — close it and re-run)`);
			return;
		}
		throw error;
	}
}

mkdirSync(outDir, { recursive: true });

// CL01 en dernier : souvent ouvert dans Excel pendant la QA
writeFixture('CL02-partial-import.xlsx', [
	['6ème J', '6ème', 25],
	['5ème F', '5ème', 25],
	['4ème D', '4ème', 25],
	['', '6ème', 25],
	['6ème K', '7ème Z', 25],
]);

// CL03 — Toutes lignes invalides (niveau inconnu)
writeFixture('CL03-error-unknown-niveau.xlsx', [
	['6ème J', '7ème Z', 30],
	['5ème F', 'Terminale X', 30],
]);

// CL04 — Champs obligatoires manquants
writeFixture('CL04-error-missing-required.xlsx', [
	['', '6ème', 30],
	['6ème J', '', 30],
	['', '', ''],
]);

// CL05 — Capacité invalide
writeFixture('CL05-error-invalid-capacity.xlsx', [
	['6ème J', '6ème', 'abc'],
	['5ème F', '5ème', -5],
	['4ème D', '4ème', 0],
]);

// CL06 — Doublon dans le fichier (même nom + même niveau)
writeFixture('CL06-error-duplicate-in-file.xlsx', [
	['6ème J', '6ème', 30],
	['6ème J', '6ème', 35],
	['5ème F', '5ème', 30],
]);

// CL07 — Doublon avec classe déjà en base (6ème A) + une nouvelle classe
writeFixture('CL07-error-duplicate-existing.xlsx', [
	['6ème A', '6ème', 30],
	['6ème J', '6ème', 30],
]);

// CL08 — Feuille vide (en-têtes seulement)
writeFixture('CL08-headers-only.xlsx', []);

// CL09 — Espaces autour des valeurs (trim)
writeFixture('CL09-trim-and-case.xlsx', [
	['  6ème K  ', '  6ème  ', '  40  '],
	['6ème L', '6ème', 35],
]);

// CL01 — Import nominal : jeu représentatif type collège (18 classes)
writeFixture('CL01-happy-all-valid.xlsx', [
	['6ème A', '6ème', 35],
	['6ème B', '6ème', 35],
	['6ème C', '6ème', 35],
	['6ème D', '6ème', 35],
	['6ème E', '6ème', 35],
	['6ème F', '6ème', 35],
	['6ème G', '6ème', 35],
	['6ème H', '6ème', 35],
	['6ème I', '6ème', 35],
	['5ème B', '5ème', 32],
	['5ème A', '5ème', 32],
	['5ème C', '5ème', 32],
	['5ème D', '5ème', 32],
	['5ème E', '5ème', 32],
	['4ème B', '4ème', 30],
	['3ème A', '3ème', 28],
	['4ème C', '4ème', 30],
	['3ème B', '3ème', 28],
]);

console.log(`Generated class import fixtures in ${outDir}`);
