#!/usr/bin/env bun
/**
 * Génère qa-test-matrix.xlsx — gabarit QA par module / endpoint / action.
 * Fusionne les NOT OK connus depuis qa-checklist-results.json si présent.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { QA_TEMPLATE_MATRIX_RUNNABLE, type QaTemplateRow } from './qa-template-matrix';
import { describeTestExactly } from './qa-test-descriptions';

const ROOT = path.join(import.meta.dirname, '../../../..');
const MATRIX_RESULTS_PATH = path.join(ROOT, 'qa-matrix-results.json');
const LEGACY_RESULTS_PATH = path.join(ROOT, 'qa-checklist-results.json');
const CSV_PATH = path.join(ROOT, 'qa-test-matrix.csv');
const XLSX_PATH = path.join(ROOT, 'qa-test-matrix.xlsx');

interface ResultRow {
	page?: string;
	probleme?: string;
	etat?: string;
	detail?: string;
}

interface MatrixResultRow {
	module?: string;
	endpoint?: string;
	action?: string;
	statut?: string;
	detail?: string;
}

function normalizeEndpoint(url: string): string {
	return url
		.replace(/^https?:\/\/[^/]+/i, 'http://localhost:5173')
		.replace(/\/+/g, '/')
		.toLowerCase()
		.replace(/\[.*?\]/g, '[id]');
}

function normalizeText(text: string): string {
	return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function matchResult(row: QaTemplateRow, result: ResultRow): boolean {
	const prob = normalizeText(result.probleme ?? '');
	const action = normalizeText(row.action);
	// Correspondances explicites (évite faux positifs type trimestre ↔ semestre)
	if (prob.includes('semestre') && !action.includes('semestre')) return false;
	if (prob.includes('trimestre') && !action.includes('trimestre')) return false;
	if (prob.includes('filtre statut') && !action.includes('filtre statut')) return false;
	if (prob.includes('création') && prob.includes('élève') && !action.includes('créer élève')) return false;
	if (prob.includes('frais') && !action.includes('frais')) return false;
	if (prob.includes('login') && prob.includes('erreur') && !action.includes('erreur')) return false;

	const ep = normalizeEndpoint(row.endpoint);
	const resEp = normalizeEndpoint(result.page ?? '');
	if (ep !== resEp && !ep.includes(resEp.replace('http://localhost:5173', '')) && !resEp.includes(ep.replace('http://localhost:5173', ''))) {
		const epTail = ep.split('/').slice(-2).join('/');
		const resTail = resEp.split('/').slice(-2).join('/');
		if (epTail !== resTail && !ep.includes('[id]') && !resEp.includes('[id]')) {
			return false;
		}
	}
	const actionWords = new Set(action.split(/\W+/).filter(w => w.length > 3));
	const probWords = new Set(prob.split(/\W+/).filter(w => w.length > 3));
	const overlap = [...actionWords].filter(w => probWords.has(w));
	return overlap.length >= 2 || prob.includes(action.slice(0, 20)) || action.includes(prob.slice(0, 20));
}

/** Pré-remplissage explicite depuis le dernier run auto + bugs connus */
const KNOWN_FAILURES: Array<{
	module: string;
	endpoint: string;
	actionMatch: RegExp;
	detail: string;
	statut?: 'NOT OK' | 'N/A';
}> = [
	{
		module: 'Auth',
		endpoint: 'http://localhost:5173/login',
		actionMatch: /erreur visible/i,
		detail: 'Aucun message inline visible — toast seulement (LoginPasswordPanel)',
	},
	{
		module: 'École',
		endpoint: 'http://localhost:5173/school/students',
		actionMatch: /créer élève/i,
		detail: 'Modal reste ouvert — lifecycle_outside_component / getContext dans StudentCreateModal submit',
	},
	{
		module: 'École',
		endpoint: 'http://localhost:5173/school/students',
		actionMatch: /filtre statut/i,
		detail: 'Filtre inactif/archivé ne retourne pas les élèves (à confirmer manuellement)',
	},
	{
		module: 'Finance',
		endpoint: 'http://localhost:5173/finance/fees',
		actionMatch: /créer frais/i,
		detail: 'Bouton « Nouveau frais » non trouvé par script auto (vérifier PermissionGate / libellé)',
	},
	{
		module: 'Onboarding',
		endpoint: 'http://localhost:5173/onboarding?step=1',
		actionMatch: /semestre.*S1/i,
		detail: 'Semestre 1 : dates début/fin non recalculées quand dates année changent (S2 OK via addPeriod)',
	},
	{
		module: 'Classes',
		endpoint: 'http://localhost:5173/classes/[classId]/evaluations/[id]/details',
		actionMatch: /.*/,
		detail: 'Deep-link seed ci-asm-6a-t1-math absent — redirect liste (DB onboardée ≠ demo-ci)',
		statut: 'N/A' as const,
	},
];

async function loadMatrixResults(): Promise<MatrixResultRow[]> {
	try {
		const raw = await readFile(MATRIX_RESULTS_PATH, 'utf-8');
		const data = JSON.parse(raw);
		return data.results ?? [];
	}
	catch {
		return [];
	}
}

async function loadLegacyResults(): Promise<ResultRow[]> {
	try {
		const raw = await readFile(LEGACY_RESULTS_PATH, 'utf-8');
		const data = JSON.parse(raw);
		return data.results ?? [];
	}
	catch {
		return [];
	}
}

function isSkippedResult(detail: string): boolean {
	const d = detail.toLowerCase();
	return d.includes('skip') || d.includes('aucun élève qa');
}

function resolveRow(
	row: QaTemplateRow,
	matrixResults: MatrixResultRow[],
	legacyResults: ResultRow[],
): { statut: string; detail: string; suggestion: string } {
	const exact = matrixResults.find(
		r => r.module === row.module && r.endpoint === row.endpoint && r.action === row.action,
	);
	if (exact?.statut) {
		return {
			statut: exact.statut,
			detail: exact.statut === 'NOT OK' || exact.statut === 'N/A' ? (exact.detail ?? '') : '',
			suggestion: '',
		};
	}

	for (const known of KNOWN_FAILURES) {
		if (
			row.module === known.module
			&& normalizeEndpoint(row.endpoint) === normalizeEndpoint(known.endpoint)
			&& known.actionMatch.test(row.action)
		) {
			return { statut: known.statut ?? 'NOT OK', detail: known.detail, suggestion: '' };
		}
	}
	for (const result of legacyResults) {
		if (!matchResult(row, result)) continue;
		const detail = result.detail ?? '';
		if (result.etat === 'NOT OK' && isSkippedResult(detail)) {
			return { statut: 'N/A', detail, suggestion: '' };
		}
		if (result.etat === 'NOT OK') {
			return { statut: 'NOT OK', detail, suggestion: '' };
		}
		if (result.etat === 'OK') {
			return { statut: 'OK', detail: '', suggestion: '' };
		}
		if (result.etat === 'N/A') {
			return { statut: 'N/A', detail, suggestion: '' };
		}
	}
	return { statut: 'À faire', detail: '', suggestion: '' };
}

async function main(): Promise<void> {
	const matrixResults = await loadMatrixResults();
	const legacyResults = matrixResults.length > 0 ? [] : await loadLegacyResults();
	const header = [
		'Catégorie',
		'Endpoint',
		'Action / description du test',
		'Objectif du test',
		'Détail problème',
		'Suggestion',
		'Statut',
	];
	const lines: string[][] = [header];

	const stats = { ok: 0, notOk: 0, na: 0, todo: 0 };

	for (const row of QA_TEMPLATE_MATRIX_RUNNABLE) {
		const { statut, detail, suggestion } = resolveRow(row, matrixResults, legacyResults);
		if (statut === 'OK') stats.ok++;
		else if (statut === 'NOT OK') stats.notOk++;
		else if (statut === 'N/A') stats.na++;
		else stats.todo++;

		lines.push([
			row.module,
			row.endpoint,
			row.action,
			describeTestExactly(row),
			statut === 'NOT OK' ? detail : '',
			suggestion,
			statut,
		]);
	}

	const csv = lines.map(cols => cols.map(c => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
	await writeFile(CSV_PATH, `\uFEFF${csv}`, 'utf-8');

	const py = spawnSync(
		'python',
		[path.join(import.meta.dirname, 'generate-qa-template-xlsx.py'), CSV_PATH, XLSX_PATH],
		{ stdio: 'inherit', shell: true },
	);

	console.log(`\nMatrice QA générée : ${QA_TEMPLATE_MATRIX_RUNNABLE.length} lignes`);
	console.log(`  OK: ${stats.ok}  NOT OK: ${stats.notOk}  N/A: ${stats.na}  À faire: ${stats.todo}`);
	console.log(`  CSV:  ${CSV_PATH}`);
	console.log(`  XLSX: ${XLSX_PATH}`);

	process.exit(py.status === 0 ? 0 : 1);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
