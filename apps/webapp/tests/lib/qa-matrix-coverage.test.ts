import { describe, expect, it } from 'bun:test';
import {
	LEGACY_ROUTES,
	MODAL_SURFACES,
	REDIRECT_SMOKE_ACTION,
	ROUTE_SMOKE_ACTION,
	getWebappFilesystemRoutes,
	inventoryRouteToMatrixPath,
	modalDeepLinkAction,
	normalizeRoutePattern,
} from '../../scripts/qa-route-catalog';
import {
	filterRunnableMatrix,
	isExcludedCatalogPath,
} from '../../scripts/qa-matrix-exclusions';
import { QA_TEMPLATE_MATRIX } from '../../scripts/qa-template-matrix';

const RUNNABLE_MATRIX = filterRunnableMatrix(QA_TEMPLATE_MATRIX);

function matrixPathForRow(endpoint: string): string {
	return normalizeRoutePattern(endpoint);
}

function hasMatrixRowForPath(matrixPath: string): boolean {
	const normalized = normalizeRoutePattern(matrixPath);
	return RUNNABLE_MATRIX.some(row => matrixPathForRow(row.endpoint) === normalized);
}

function hasNavigationSmoke(matrixPath: string): boolean {
	const normalized = normalizeRoutePattern(matrixPath);
	return RUNNABLE_MATRIX.some(
		row => matrixPathForRow(row.endpoint) === normalized && row.action === ROUTE_SMOKE_ACTION,
	);
}

function hasModalDeepLink(parentRoute: string, modal: string): boolean {
	const parent = normalizeRoutePattern(parentRoute);
	const action = modalDeepLinkAction(modal);
	return RUNNABLE_MATRIX.some(row => {
		const rowPath = matrixPathForRow(row.endpoint.split('?')[0] ?? row.endpoint);
		return rowPath === parent && row.action === action;
	});
}

function hasRedirectSmoke(legacyPath: string): boolean {
	const normalized = normalizeRoutePattern(legacyPath);
	return RUNNABLE_MATRIX.some(
		row => matrixPathForRow(row.endpoint) === normalized && row.action === REDIRECT_SMOKE_ACTION,
	);
}

describe('QA matrix catalog coverage', () => {
	it('has a matrix row for every automated webapp filesystem route', () => {
		const missing: string[] = [];
		for (const route of getWebappFilesystemRoutes()) {
			if (route.type === 'redirect') continue;
			const matrixPath = inventoryRouteToMatrixPath(route.url);
			if (isExcludedCatalogPath(matrixPath)) continue;
			if (!hasMatrixRowForPath(matrixPath)) {
				missing.push(matrixPath);
			}
		}
		expect(missing).toEqual([]);
	});

	it('has navigation smoke rows for every automated webapp filesystem route', () => {
		const missing: string[] = [];
		for (const route of getWebappFilesystemRoutes()) {
			if (route.type === 'redirect') continue;
			const matrixPath = inventoryRouteToMatrixPath(route.url);
			if (isExcludedCatalogPath(matrixPath)) continue;
			if (!hasNavigationSmoke(matrixPath)) {
				missing.push(matrixPath);
			}
		}
		expect(missing).toEqual([]);
	});

	it('has modal deep-link rows for every automated MODAL_SURFACES entry', () => {
		const missing = MODAL_SURFACES.filter(
			surface => !isExcludedCatalogPath(surface.parentRoute)
				&& !hasModalDeepLink(surface.parentRoute, surface.modal),
		).map(surface => `${surface.parentRoute}?modal=${surface.modal}`);
		expect(missing).toEqual([]);
	});

	it('has redirect smoke rows for every automated LEGACY_ROUTES entry', () => {
		const missing = [...LEGACY_ROUTES].filter(legacy => {
			const matrixPath = inventoryRouteToMatrixPath(legacy);
			return !isExcludedCatalogPath(matrixPath) && !hasRedirectSmoke(matrixPath);
		});
		expect(missing).toEqual([]);
	});

	it('does not auto-smoke module namespace roots', () => {
		const namespaceRows = RUNNABLE_MATRIX.filter(row =>
			row.action === ROUTE_SMOKE_ACTION || row.action === REDIRECT_SMOKE_ACTION,
		).filter(row => isExcludedCatalogPath(inventoryRouteToMatrixPath(
			row.endpoint.replace(/^https?:\/\/[^/]+/i, ''),
		)));
		expect(namespaceRows).toEqual([]);
	});
});
