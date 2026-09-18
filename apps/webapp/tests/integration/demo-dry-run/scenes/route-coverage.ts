import {
	getWebappFilesystemRoutes,
	inventoryRouteToMatrixPath,
	resolveRouteDescription,
} from '../../../../scripts/qa-route-catalog';
import { isExcludedCatalogPath } from '../../../../scripts/qa-matrix-exclusions';
import { APP_SHELL_SELECTOR, CLASS_6A, CLASS_6B, STUDENT_NAME } from '../support/constants';
import { configClassGroupPath, schoolStudentPath } from '../support/paths';
import type { DemoContext } from '../support/types';
import { visit, visitOrSkip } from '../support/visit';

interface RouteVisit {
	path: string;
	step: string;
	pathPrefix?: string;
	selector?: string;
	expectText?: RegExp;
	skipOnFail?: string;
	retry?: boolean;
}

type RouteVisitOverride = Partial<Omit<RouteVisit, 'path'>> & { demoPath?: string };

const ROUTE_VISIT_OVERRIDES: Record<string, RouteVisitOverride> = {
	'/dashboard': { step: 'Dashboard overview', selector: undefined },
	'/school/students': { step: 'School students list', selector: undefined },
	'/school/calendar': { step: 'School calendar', skipOnFail: 'Calendar query may return 403' },
	'/classes/[classId]/attendance': {
		demoPath: `/classes/${CLASS_6B}/attendance`,
		step: 'Class attendance list',
	},
	'/configuration/tools': {
		step: 'Configuration tools hub',
		selector: '[data-testid="import-pack-generic"], [data-testid="timetable-planning-tool"]',
		retry: true,
	},
	'/configuration/report-cards': {
		step: 'Configuration report card definitions',
		skipOnFail: 'May require REPORT_CARD_CONFIGURE',
	},
};

function demoPathFromMatrix(matrixPath: string): string {
	const override = ROUTE_VISIT_OVERRIDES[matrixPath]?.demoPath;
	if (override) return override;
	return matrixPath.replaceAll('[classId]', CLASS_6A);
}

function humanStep(matrixPath: string, inventoryUrl: string): string {
	const override = ROUTE_VISIT_OVERRIDES[matrixPath]?.step;
	if (override) return override;

	const described = resolveRouteDescription(inventoryUrl);
	if (described) {
		return described.replace(/^Liste /, '').replace(/^Vue /, '');
	}

	const segment = matrixPath.split('/').filter(Boolean).pop() ?? matrixPath;
	return segment
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

function isDemoListRoute(matrixPath: string): boolean {
	if (isExcludedCatalogPath(matrixPath)) return false;
	if (matrixPath.includes('[id]') || matrixPath.includes('[sessionId]')) return false;
	if (matrixPath === '/school') return false;
	if (matrixPath.startsWith('/login') || matrixPath.startsWith('/onboarding') || matrixPath.startsWith('/invite')) {
		return false;
	}
	return true;
}

function buildRouteVisitsFromCatalog(): readonly RouteVisit[] {
	const visits: RouteVisit[] = [];
	const seen = new Set<string>();

	for (const route of getWebappFilesystemRoutes()) {
		if (route.type === 'redirect') continue;

		const matrixPath = inventoryRouteToMatrixPath(route.url);
		if (!isDemoListRoute(matrixPath)) continue;

		const override = ROUTE_VISIT_OVERRIDES[matrixPath] ?? {};
		const path = demoPathFromMatrix(matrixPath);
		if (seen.has(path)) continue;
		seen.add(path);

		const pathPrefix = override.pathPrefix ?? path.split('?')[0];
		let selector: string | undefined;
		if ('selector' in override) {
			selector = override.selector;
		}
		else if (path.startsWith('/finance')) {
			selector = APP_SHELL_SELECTOR;
		}
		else if (path === '/dashboard' || path === '/school/students') {
			selector = undefined;
		}
		else {
			selector = 'main';
		}

		visits.push({
			path,
			step: humanStep(matrixPath, route.url),
			pathPrefix,
			selector,
			expectText: override.expectText,
			skipOnFail: override.skipOnFail,
			retry: override.retry,
		});
	}

	visits.push({
		path: schoolStudentPath('ci-s1'),
		step: 'School student drawer profile tab',
		pathPrefix: schoolStudentPath('ci-s1'),
		expectText: STUDENT_NAME,
	});
	visits.push({
		path: configClassGroupPath(CLASS_6A, 'profile'),
		step: 'Configuration class group drawer profile tab',
		pathPrefix: `/configuration/classes/${CLASS_6A}`,
	});

	return visits.sort((a, b) => a.path.localeCompare(b.path));
}

const ROUTE_VISITS = buildRouteVisitsFromCatalog();

/** Visits every migrated staff route (list + representative drawers). */
export async function runRouteCoverageScenes(ctx: DemoContext): Promise<void> {
	const scene = 'DR';
	const { base } = ctx;

	for (const [index, route] of ROUTE_VISITS.entries()) {
		const step = `${index + 1} ${route.step}`;
		const url = `${base}${route.path}`;
		if (route.skipOnFail) {
			await visitOrSkip(ctx, url, scene, step, {
				pathPrefix: route.pathPrefix,
				selector: route.selector,
				expectText: route.expectText,
				skipOnFail: route.skipOnFail,
				retry: route.retry,
			});
		}
		else {
			await visit(ctx, url, scene, step, {
				pathPrefix: route.pathPrefix,
				selector: route.selector,
				expectText: route.expectText,
				retry: route.retry,
			});
		}
	}
}
