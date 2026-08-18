#!/usr/bin/env bun
/**
 * Sync generated QA matrix rows from qa-route-catalog.ts.
 * Writes qa-template-matrix.generated.ts (do not edit by hand).
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
	LEGACY_ROUTES,
	MODAL_SURFACES,
	ROUTE_REDIRECTS,
	ROUTE_SMOKE_ACTION,
	REDIRECT_SMOKE_ACTION,
	SIDEBAR_HREFS,
	getWebappFilesystemRoutes,
	inventoryRouteToMatrixPath,
	modalDeepLinkAction,
	resolveModuleFromPath,
	sidebarLinkAction,
} from './qa-route-catalog';
import { isExcludedCatalogPath } from './qa-matrix-exclusions';
import type { QaModule, QaTemplateRow } from './qa-template-matrix.manual';
import { QA_TEMPLATE_MATRIX_MANUAL } from './qa-template-matrix.manual';

const B = 'http://localhost:5173';
const OUT_PATH = path.join(import.meta.dirname, 'qa-template-matrix.generated.ts');

const MODULE_MAP: Record<string, QaModule> = {
	Public: 'Auth',
	Dashboard: 'Dashboard',
	Compte: 'Compte',
	'École': 'École',
	Classes: 'Classes',
	Finances: 'Finance',
	Configuration: 'Configuration',
	Autre: 'Shell',
};

function toQaModule(module: string): QaModule {
	return MODULE_MAP[module] ?? 'Shell';
}

function rowKey(row: Pick<QaTemplateRow, 'endpoint' | 'action'>): string {
	return `${row.endpoint.toLowerCase()}::${row.action.toLowerCase()}`;
}

function manualKeys(): Set<string> {
	return new Set(QA_TEMPLATE_MATRIX_MANUAL.map(rowKey));
}

function matrixEndpoint(matrixPath: string): string {
	return matrixPath.startsWith('http') ? matrixPath : `${B}${matrixPath.startsWith('/') ? matrixPath : `/${matrixPath}`}`;
}

function addRow(
	rows: QaTemplateRow[],
	seen: Set<string>,
	manual: Set<string>,
	module: QaModule,
	endpoint: string,
	action: string,
) {
	const key = rowKey({ endpoint, action });
	if (manual.has(key) || seen.has(key)) return;
	seen.add(key);
	rows.push({ module, endpoint, action });
}

function generate(): QaTemplateRow[] {
	const manual = manualKeys();
	const seen = new Set<string>();
	const rows: QaTemplateRow[] = [];

	for (const route of getWebappFilesystemRoutes()) {
		if (route.type === 'redirect') continue;
		const matrixPath = inventoryRouteToMatrixPath(route.url);
		if (isExcludedCatalogPath(matrixPath)) continue;
		const module = toQaModule(resolveModuleFromPath(route.url));
		addRow(rows, seen, manual, module, matrixEndpoint(matrixPath), ROUTE_SMOKE_ACTION);
	}

	for (const [source, target] of Object.entries(ROUTE_REDIRECTS)) {
		if (!LEGACY_ROUTES.has(source) && !source.includes('?') && target.includes('(')) continue;
		const matrixPath = inventoryRouteToMatrixPath(source);
		if (isExcludedCatalogPath(matrixPath)) continue;
		const module = toQaModule(resolveModuleFromPath(source));
		addRow(rows, seen, manual, module, matrixEndpoint(matrixPath), REDIRECT_SMOKE_ACTION);
	}

	for (const legacy of LEGACY_ROUTES) {
		const matrixPath = inventoryRouteToMatrixPath(legacy);
		if (isExcludedCatalogPath(matrixPath)) continue;
		const module = toQaModule(resolveModuleFromPath(legacy));
		addRow(rows, seen, manual, module, matrixEndpoint(matrixPath), REDIRECT_SMOKE_ACTION);
	}

	for (const surface of MODAL_SURFACES) {
		if (isExcludedCatalogPath(surface.parentRoute)) continue;
		const parent = surface.tab
			? `${surface.parentRoute.replace(/\/$/, '')}/${surface.tab}`
			: surface.parentRoute;
		const endpoint = `${matrixEndpoint(parent)}?modal=${surface.modal}`;
		addRow(rows, seen, manual, surface.module as QaModule, endpoint, modalDeepLinkAction(surface.modal));
	}

	for (const link of SIDEBAR_HREFS) {
		const href = link.classSegment
			? `/classes/[classId]/${link.href}`
			: link.href;
		if (isExcludedCatalogPath(href)) continue;
		const module = link.module as QaModule;
		addRow(rows, seen, manual, module, matrixEndpoint(href), sidebarLinkAction(link.labelKey));
	}

	return rows;
}

function formatGeneratedFile(rows: QaTemplateRow[]): string {
	const lines = rows.map((row) =>
		`\t{ module: '${row.module}', endpoint: '${row.endpoint}', action: '${row.action.replace(/'/g, "\\'")}' },`,
	);
	return `/**
 * AUTO-GENERATED — run: bun run qa:matrix:sync
 * Do not edit by hand.
 */
import type { QaTemplateRow } from './qa-template-matrix.manual';

export const QA_TEMPLATE_MATRIX_GENERATED: QaTemplateRow[] = [
${lines.join('\n')}
];
`;
}

function main(): void {
	const generated = generate();
	writeFileSync(OUT_PATH, formatGeneratedFile(generated), 'utf-8');
	console.log(`Generated ${generated.length} matrix rows → ${OUT_PATH}`);
	console.log(`Manual rows: ${QA_TEMPLATE_MATRIX_MANUAL.length}`);
	console.log(`Total matrix: ${QA_TEMPLATE_MATRIX_MANUAL.length + generated.length}`);
}

main();
