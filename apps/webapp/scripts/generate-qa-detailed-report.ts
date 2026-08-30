#!/usr/bin/env bun
/**
 * Detailed QA matrix Excel — all template rows with log-style trace, procedure, inputs, status, blockers.
 *
 * Usage: bun run qa:report:detailed
 * Output: qa-test-matrix-detailed.xlsx (+ CSV) at repo root
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { QA_TEMPLATE_MATRIX, QA_TEMPLATE_MATRIX_RUNNABLE } from './qa-template-matrix';
import { isExcludedMatrixRow } from './qa-matrix-exclusions';
import {
	blockerDetail,
	describeTestExactly,
	describeTestInputs,
	logTrace,
} from './qa-test-descriptions';
import type { QaTemplateRow } from './qa-template-matrix.manual';

const WEBAPP_DIR = path.join(import.meta.dirname, '..');
const ROOT = path.join(import.meta.dirname, '../../../..');
const MATRIX_RESULTS_PATH = path.join(WEBAPP_DIR, '.integration-run', 'qa-matrix-results.json');
const CSV_PATH = path.join(ROOT, 'qa-test-matrix-detailed.csv');
const XLSX_PATH = path.join(ROOT, 'qa-test-matrix-detailed.xlsx');

interface MatrixResultRow {
	module: string;
	endpoint: string;
	action: string;
	statut: string;
	detail?: string;
}

function normalizeStatut(s: string | undefined): string {
	if (!s) return 'À faire';
	if (s === 'NOT OK') return 'NOT OK';
	if (s === 'N/A') return 'N/A';
	if (s === 'OK') return 'OK';
	return s;
}

async function loadResults(): Promise<MatrixResultRow[]> {
	try {
		const raw = await readFile(MATRIX_RESULTS_PATH, 'utf8');
		const parsed = JSON.parse(raw) as { results?: MatrixResultRow[] };
		return parsed.results ?? [];
	}
	catch {
		return [];
	}
}

function findResult(row: QaTemplateRow, results: MatrixResultRow[]): MatrixResultRow | undefined {
	return results.find(
		r => r.module === row.module && r.endpoint === row.endpoint && r.action === row.action,
	);
}

function resolveStatus(
	row: QaTemplateRow,
	results: MatrixResultRow[],
	runnableSet: Set<string>,
): { statut: string; detail?: string } {
	const key = `${row.module}\0${row.endpoint}\0${row.action}`;
	const excluded = isExcludedMatrixRow(row);
	const inRunnable = runnableSet.has(key);

	const exact = findResult(row, results);
	if (exact) {
		return { statut: normalizeStatut(exact.statut), detail: exact.detail };
	}

	if (excluded || !inRunnable) {
		return {
			statut: 'Manuel',
			detail: 'Module/route exclu du run provisioned (Auth, Onboarding, Outils, tools, etc.)',
		};
	}

	return { statut: 'À faire', detail: 'Pas de résultat dans qa-matrix-results.json' };
}

function rowKey(row: QaTemplateRow): string {
	return `${row.module}\0${row.endpoint}\0${row.action}`;
}

async function main(): Promise<void> {
	const results = await loadResults();
	const runnableSet = new Set(QA_TEMPLATE_MATRIX_RUNNABLE.map(rowKey));

	const header = [
		'#',
		'Trace log (console)',
		'Ce que le test vérifie exactement',
		'Entrées / inputs du test',
		'Statut',
		'Blocker / détail',
		'Catégorie',
		'Endpoint',
		'Action (matrice)',
		'Exécuté en run auto',
	];

	const lines: string[][] = [header];
	let idx = 0;
	const stats = { ok: 0, notOk: 0, na: 0, manual: 0, todo: 0 };

	for (const row of QA_TEMPLATE_MATRIX) {
		idx += 1;
		const { statut, detail } = resolveStatus(row, results, runnableSet);
		if (statut === 'OK') stats.ok++;
		else if (statut === 'NOT OK') stats.notOk++;
		else if (statut === 'N/A') stats.na++;
		else if (statut === 'Manuel') stats.manual++;
		else stats.todo++;

		const autoRun = isExcludedMatrixRow(row) ? 'Non' : 'Oui (307 runnable)';

		lines.push([
			String(idx),
			logTrace(row, statut),
			describeTestExactly(row),
			describeTestInputs(row),
			statut,
			blockerDetail(statut, detail, row),
			row.module,
			row.endpoint,
			row.action,
			autoRun,
		]);
	}

	const csv = lines.map(cols => cols.map(c => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
	await writeFile(CSV_PATH, `\uFEFF${csv}`, 'utf-8');

	const py = spawnSync(
		'python',
		[path.join(import.meta.dirname, 'generate-qa-detailed-xlsx.py'), CSV_PATH, XLSX_PATH],
		{ stdio: 'inherit', shell: true },
	);

	console.log(`\nRapport détaillé QA : ${QA_TEMPLATE_MATRIX.length} cas de test`);
	console.log(`  Matrice complète: ${QA_TEMPLATE_MATRIX.length} | Runnable (dernier run): ${QA_TEMPLATE_MATRIX_RUNNABLE.length}`);
	console.log(`  OK: ${stats.ok}  NOT OK: ${stats.notOk}  N/A: ${stats.na}  Manuel: ${stats.manual}  À faire: ${stats.todo}`);
	console.log(`  CSV:  ${CSV_PATH}`);
	console.log(`  XLSX: ${XLSX_PATH}`);
	console.log(`  Source résultats: ${MATRIX_RESULTS_PATH}`);

	process.exit(py.status === 0 ? 0 : 1);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
