/**
 * Rows and routes excluded from automated QA matrix runs (manual testing only).
 *
 * Delete rows: provisioned runs assert the delete control is visible without clicking
 * (see `isDeleteControlVisible` in qa-harness-ui.ts).
 */
import type { QaModule, QaTemplateRow } from './qa-template-matrix.manual';
import { isNamespaceRootPath } from './qa-route-catalog';

/** Whole modules tested manually. */
export const ALWAYS_EXCLUDED_MODULES: readonly QaModule[] = [
	'Auth',
	'Onboarding',
	'Outils & imports',
];

const EXCLUDED_PATH_PREFIXES = [
	'/login',
	'/invite/',
	'/onboarding',
	'/configuration/tools',
	'/school/teacher-assignments',
] as const;

/** Layout-only routes with no standalone page content. */
const EXCLUDED_EXACT_PATHS = new Set([
	'/account',
]);

const EXCLUDED_SHELL_ACTIONS = new Set([
	'Non connecté → redirect /login',
	'Onboarding incomplet → redirect /onboarding',
]);

/** Manual-only actions (empty inbox, seeded data, etc.). */
const EXCLUDED_MATRIX_ACTIONS = new Set([
	'Ouvrir un message',
]);

export function matrixEndpointPath(endpoint: string): string {
	if (endpoint === '(app)' || endpoint === '(multi-comptes)') {
		return endpoint;
	}
	const url = endpoint.startsWith('http')
		? endpoint
		: `http://localhost:5173${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
	return new URL(url).pathname;
}

export function isExcludedEndpointPath(pathname: string): boolean {
	const path = pathname.toLowerCase();
	if (path === '/') return true;
	if (EXCLUDED_EXACT_PATHS.has(path)) return true;
	return EXCLUDED_PATH_PREFIXES.some(
		prefix => path === prefix.replace(/\/$/, '') || path.startsWith(prefix),
	);
}

export function isExcludedCatalogPath(matrixPath: string): boolean {
	if (isNamespaceRootPath(matrixPath)) return true;
	return isExcludedEndpointPath(matrixPath);
}

export function isExcludedMatrixRow(
	row: QaTemplateRow,
	extraModules: ReadonlySet<string> = new Set(),
): boolean {
	if (ALWAYS_EXCLUDED_MODULES.includes(row.module) || extraModules.has(row.module)) {
		return true;
	}

	const path = matrixEndpointPath(row.endpoint);
	if (path !== '(app)' && path !== '(multi-comptes)' && isExcludedEndpointPath(path)) {
		return true;
	}

	if (row.module === 'Shell' && row.endpoint === '(app)' && EXCLUDED_SHELL_ACTIONS.has(row.action)) {
		return true;
	}

	if (EXCLUDED_MATRIX_ACTIONS.has(row.action)) {
		return true;
	}

	if (row.action.includes('/configuration/tools')) {
		return true;
	}

	return false;
}

export function filterRunnableMatrix(
	rows: readonly QaTemplateRow[],
	extraModules: Iterable<string> = [],
): QaTemplateRow[] {
	const extra = new Set(extraModules);
	return rows.filter(row => !isExcludedMatrixRow(row, extra));
}

export function defaultExcludedModulesForRun(): string[] {
	return [...ALWAYS_EXCLUDED_MODULES];
}
