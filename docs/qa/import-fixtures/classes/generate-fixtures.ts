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
	['6eme J', '6eme', 25],
	['5eme F', '5eme', 25],
	['4eme D', '4eme', 25],
	['', '6eme', 25],
	['6eme K', '7eme Z', 25],
]);

// CL03 — Toutes lignes invalides (niveau inconnu)
writeFixture('CL03-error-unknown-niveau.xlsx', [
	['6eme J', '7eme Z', 30],
	['5eme F', 'Terminale X', 30],
]);

// CL04 — Champs obligatoires manquants
writeFixture('CL04-error-missing-required.xlsx', [
	['', '6eme', 30],
	['6eme J', '', 30],
	['', '', ''],
]);

// CL05 — Capacité invalide
writeFixture('CL05-error-invalid-capacity.xlsx', [
	['6eme J', '6eme', 'abc'],
	['5eme F', '5eme', -5],
	['4eme D', '4eme', 0],
]);

// CL06 — Doublon dans le fichier (même nom + même niveau)
writeFixture('CL06-error-duplicate-in-file.xlsx', [
	['6eme J', '6eme', 30],
	['6eme J', '6eme', 35],
	['5eme F', '5eme', 30],
]);

// CL07 — Doublon avec classe déjà en base (6eme A) + une nouvelle classe
writeFixture('CL07-error-duplicate-existing.xlsx', [
	['6eme A', '6eme', 30],
	['6eme J', '6eme', 30],
]);

// CL08 — Feuille vide (en-têtes seulement)
writeFixture('CL08-headers-only.xlsx', []);

// CL09 — Espaces autour des valeurs (trim)
writeFixture('CL09-trim-and-case.xlsx', [
	['  6eme K  ', '  6eme  ', '  40  '],
	['6eme L', '6eme', 35],
]);

// CL01 — Import nominal : jeu représentatif type collège (18 classes)
writeFixture('CL01-happy-all-valid.xlsx', [
	['6eme A', '6eme', 35],
	['6eme B', '6eme', 35],
	['6eme C', '6eme', 35],
	['6eme D', '6eme', 35],
	['6eme E', '6eme', 35],
	['6eme F', '6eme', 35],
	['6eme G', '6eme', 35],
	['6eme H', '6eme', 35],
	['6eme I', '6eme', 35],
	['5eme B', '5eme', 32],
	['5eme A', '5eme', 32],
	['5eme C', '5eme', 32],
	['5eme D', '5eme', 32],
	['5eme E', '5eme', 32],
	['4eme B', '4eme', 30],
	['3eme A', '3eme', 28],
	['4eme C', '4eme', 30],
	['3eme B', '3eme', 28],
]);

console.log(`Generated class import fixtures in ${outDir}`);
