/**
 * Matrix ownership boundaries: Auth/Onboarding execute in their dedicated suite.
 * Development-only routes remain explicit exclusions; tools/imports execute here.
 */
import features from '../tests/integration/features.json';
import type { QaModule, QaTemplateRow } from './qa-template-matrix.manual';
import { isNamespaceRootPath, REDIRECT_SMOKE_ACTION } from './qa-route-catalog';

export const loaderRedirectPaths = new Set(features
	.filter(feature => feature.coverage === 'loader')
	.map(feature => matrixEndpointPath(feature.endpoint)));

/** Whole modules tested manually. */
export const ALWAYS_EXCLUDED_MODULES: readonly QaModule[] = [
	'Auth',
	'Onboarding',
];

const EXCLUDED_PATH_PREFIXES = [
	'/login',
	'/invite/',
	'/onboarding',
] as const;

/** Layout-only routes and development fixtures without production page content. */
const EXCLUDED_EXACT_PATHS = new Set([
	'/__design', // Development component gallery; its load guard returns 404 in production.
	'/account',
]);

const EXCLUDED_SHELL_ACTIONS = new Set([
	'Non connecté → redirect /login',
	'Onboarding incomplet → redirect /onboarding',
]);

/** Manual-only actions (empty inbox, seeded data, etc.). */
const EXCLUDED_MATRIX_ACTIONS = new Set<string>([
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
	if (row.action === REDIRECT_SMOKE_ACTION && loaderRedirectPaths.has(path)) return true;
	if (path !== '(app)' && path !== '(multi-comptes)' && isExcludedEndpointPath(path)) {
		return true;
	}

	if (row.module === 'Shell' && row.endpoint === '(app)' && EXCLUDED_SHELL_ACTIONS.has(row.action)) {
		return true;
	}

	if (EXCLUDED_MATRIX_ACTIONS.has(row.action)) {
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
