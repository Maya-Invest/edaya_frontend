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
	DRAWER_TAB_PATTERNS,
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
import { QA_TEMPLATE_MATRIX_MANUAL } from '../../scripts/qa-template-matrix.manual';
import {
	claimedModals,
	claimedPaths,
	claimedTabs,
} from '../integration/setup/journey-surfaces';
import {
	AUTH_ONBOARDING_CATALOG_COVERAGE,
	assertAuthOnboardingCatalogCoverage,
} from '../integration/onboarding/catalog-coverage';

const ONBOARDING_SCENE_IDS = [
	'unauthenticated-redirect',
	'login-signup-ui',
	'owner-relogin',
	'invited-staff-relogin',
	'api-unavailable-banner',
	'invalid-invite',
	'invite-expired',
	'invite-revoked',
	'invited-staff',
	'invited-staff-existing',
	'invited-staff-second-school',
	'happy-path',
	'wizard-step-interactions',
	'owner-wizard-resume',
	'school-period-dates',
] as const;

const RUNNABLE_MATRIX = filterRunnableMatrix(QA_TEMPLATE_MATRIX);

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
	return RUNNABLE_MATRIX.some(
		row => matrixPathForRow(row.endpoint) === normalized && row.action === REDIRECT_SMOKE_ACTION,
	);
}

describe('catalog drift', () => {
	it('claims every nav, modal, route, and journey id', () => {
		const paths = claimedPaths();
		const modals = claimedModals();
		const tabs = claimedTabs();
		const missing: string[] = [];

		for (const def of [...SCHOOL_NAV_DEFS, ...FINANCE_NAV_DEFS, ...CONFIG_NAV_DEFS]) {
			if (!paths.has(def.href)) missing.push(`nav:${def.href}`);
		}
		for (const path of CLASS_NAV_DEFS.map(def => classNavPath(def.href))) {
			if (!paths.has(path)) missing.push(`class-nav:${path}`);
		}
		for (const surface of MODAL_SURFACES) {
			const key = `${surface.parentRoute}::${surface.modal}`;
			if (!modals.has(key)) missing.push(`journey-modal:${key}`);
		}
		for (const pattern of DRAWER_TAB_PATTERNS) {
			for (const tab of pattern.tabs) {
				const key = `${pattern.routePattern}::${tab}`;
				if (!tabs.has(key)) missing.push(`tab:${key}`);
			}
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
