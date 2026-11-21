import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BROWSER_SUITE_DIRECTORIES, FOCUSED_BROWSER_SUITES } from '../../../../tooling/repo/ops/browser-suites';
import { assertVisualCoverage } from '../integration/screenshots/scenarios';
import { describe, expect, it } from 'bun:test';
import {
	CLASS_NAV_DEFS,
	CONFIG_NAV_DEFS,
	FINANCE_NAV_DEFS,
	SCHOOL_NAV_DEFS,
} from '../../src/lib/navigation/nav-catalog';
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
	loaderRedirectPaths,
} from '../../scripts/qa-matrix-exclusions';
import { QA_TEMPLATE_MATRIX } from '../../scripts/qa-template-matrix';
import { QA_TEMPLATE_MATRIX_MANUAL } from '../../scripts/qa-template-matrix.manual';

import {
	AUTH_ONBOARDING_CATALOG_COVERAGE,
	assertAuthOnboardingCatalogCoverage,
} from '../integration/onboarding/catalog-coverage';

import { assertFeatureRegistration } from '../integration/support/coverage-contract';
import { ONBOARDING_SCENARIOS } from '../integration/onboarding/scenarios';
const ONBOARDING_SCENE_IDS = ONBOARDING_SCENARIOS.map(scenario => scenario.id);

const RUNNABLE_MATRIX = filterRunnableMatrix(QA_TEMPLATE_MATRIX);
const LOADER_REDIRECTS = new Set([...loaderRedirectPaths].map(normalizeRoutePattern));

function classNavPath(href: string): string {
	return `/classes/[classId]/${href}`;
}

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
	return RUNNABLE_MATRIX.some((row) => {
		const rowPath = matrixPathForRow(row.endpoint.split('?')[0] ?? row.endpoint);
		return rowPath === parent && row.action === action;
	});
}

function hasRedirectSmoke(legacyPath: string): boolean {
	const normalized = normalizeRoutePattern(legacyPath);
	return LOADER_REDIRECTS.has(normalized) || RUNNABLE_MATRIX.some(
		row => matrixPathForRow(row.endpoint) === normalized && row.action === REDIRECT_SMOKE_ACTION,
	);
}

describe('catalog drift', () => {
	it('keeps focused browser suites executable and included in qualification evidence', () => {
		const webapp = resolve(import.meta.dirname, '../..');
		const { scripts } = JSON.parse(readFileSync(resolve(webapp, 'package.json'), 'utf8'));
		expect(new Set(FOCUSED_BROWSER_SUITES.map(suite => suite.name)).size).toBe(FOCUSED_BROWSER_SUITES.length);
		for (const suite of FOCUSED_BROWSER_SUITES) {
			expect(existsSync(resolve(webapp, 'tests/integration', suite.script))).toBe(true);
			expect(scripts[`test:integration:${suite.name}`]).toBe(`bun scripts/focused-integration-run.ts ${suite.name}`);
			expect(BROWSER_SUITE_DIRECTORIES[suite.name]).toBe(`.focused-run/${suite.name}`);
		}
	});

	it('registers every current navigation, modal, route and action', () => {
		assertFeatureRegistration();
        assertVisualCoverage();
		const missing: string[] = [];

		for (const def of [...SCHOOL_NAV_DEFS, ...FINANCE_NAV_DEFS, ...CONFIG_NAV_DEFS]) {
			if (!hasMatrixRowForPath(def.href)) missing.push(`nav:${def.href}`);
		}
		for (const path of CLASS_NAV_DEFS.map(def => classNavPath(def.href))) {
			if (!hasMatrixRowForPath(path)) missing.push(`class-nav:${path}`);
		}
		for (const route of getWebappFilesystemRoutes()) {
			if (route.type === 'redirect') continue;
			const matrixPath = inventoryRouteToMatrixPath(route.url);
			if (isExcludedCatalogPath(matrixPath)) continue;
			if (!hasMatrixRowForPath(matrixPath)) missing.push(`matrix:${matrixPath}`);
			if (!hasNavigationSmoke(matrixPath)) missing.push(`smoke:${matrixPath}`);
		}
		for (const surface of MODAL_SURFACES) {
			if (isExcludedCatalogPath(surface.parentRoute)) continue;
			if (!hasModalDeepLink(surface.parentRoute, surface.modal)) {
				missing.push(`modal:${surface.parentRoute}?modal=${surface.modal}`);
			}
		}
		for (const legacy of LEGACY_ROUTES) {
			const matrixPath = inventoryRouteToMatrixPath(legacy);
			if (isExcludedCatalogPath(matrixPath)) continue;
			if (!hasRedirectSmoke(matrixPath)) missing.push(`redirect:${matrixPath}`);
		}

		const namespaceRows = RUNNABLE_MATRIX.filter(row =>
			row.action === ROUTE_SMOKE_ACTION || row.action === REDIRECT_SMOKE_ACTION,
		).filter(row => isExcludedCatalogPath(inventoryRouteToMatrixPath(
			row.endpoint.replace(/^https?:\/\/[^/]+/i, ''),
		)));
		for (const row of namespaceRows) {
			missing.push(`namespace-root:${row.endpoint}`);
		}

		const authCatalog = QA_TEMPLATE_MATRIX_MANUAL.filter(row => row.module === 'Auth' || row.module === 'Onboarding');
		if (AUTH_ONBOARDING_CATALOG_COVERAGE.length !== authCatalog.length) {
			missing.push(`onboarding-length:${AUTH_ONBOARDING_CATALOG_COVERAGE.length}!=${authCatalog.length}`);
		}

		expect(missing).toEqual([]);
		expect(() => assertAuthOnboardingCatalogCoverage(ONBOARDING_SCENE_IDS)).not.toThrow();
	});

	it('fails when a required onboarding scene is missing', () => {
		expect(() => assertAuthOnboardingCatalogCoverage(['login-signup-ui'])).toThrow(/Uncovered release-required/);
	});
});
