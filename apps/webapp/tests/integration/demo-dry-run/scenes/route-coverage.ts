import { APP_SHELL_SELECTOR, CLASS_6A, CLASS_6B } from '../support/constants';
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
}

const ROUTE_VISITS: readonly RouteVisit[] = [
	{ path: '/dashboard', step: 'Dashboard overview' },
	{ path: '/school/students', step: 'School students list', pathPrefix: '/school/students' },
	{ path: '/school/guardians', step: 'School guardians list', pathPrefix: '/school/guardians', selector: 'main' },
	{ path: '/school/staff', step: 'School staff list', pathPrefix: '/school/staff', selector: 'main' },
	{ path: '/school/teachers', step: 'School teachers list', pathPrefix: '/school/teachers', selector: 'main' },
	{ path: '/school/calendar', step: 'School calendar', pathPrefix: '/school/calendar', skipOnFail: 'Calendar query may return 403' },
	{ path: '/school/activities', step: 'School activities list', pathPrefix: '/school/activities', selector: 'main' },
	{ path: '/school/announcements', step: 'School announcements list', pathPrefix: '/school/announcements', selector: 'main' },
	{ path: '/school/events', step: 'School incidents/events list', pathPrefix: '/school/events', selector: 'main' },
	{ path: `/classes/${CLASS_6A}/timetable`, step: 'Class timetable grid', pathPrefix: `/classes/${CLASS_6A}/timetable` },
	{ path: `/classes/${CLASS_6A}/evaluations`, step: 'Class evaluations list', pathPrefix: `/classes/${CLASS_6A}/evaluations`, selector: 'main' },
	{ path: `/classes/${CLASS_6A}/students`, step: 'Class students roster', pathPrefix: `/classes/${CLASS_6A}/students`, selector: 'main' },
	{ path: `/classes/${CLASS_6A}/teaching`, step: 'Class teaching list', pathPrefix: `/classes/${CLASS_6A}/teaching`, selector: 'main' },
	{ path: `/classes/${CLASS_6A}/report-cards`, step: 'Class report cards list', pathPrefix: `/classes/${CLASS_6A}/report-cards`, selector: 'main' },
	{ path: `/classes/${CLASS_6B}/attendance`, step: 'Class attendance list', pathPrefix: `/classes/${CLASS_6B}/attendance`, selector: 'main' },
	{ path: '/finance/fees', step: 'Finance fees list', pathPrefix: '/finance/fees', selector: APP_SHELL_SELECTOR },
	{ path: '/finance/billing', step: 'Finance billing list', pathPrefix: '/finance/billing', selector: APP_SHELL_SELECTOR },
	{ path: '/finance/payment', step: 'Finance payments list', pathPrefix: '/finance/payment', selector: APP_SHELL_SELECTOR },
	{ path: '/configuration/school', step: 'Configuration school profile', pathPrefix: '/configuration/school', selector: 'main' },
	{ path: '/configuration/academic', step: 'Configuration academic admin', pathPrefix: '/configuration/academic', selector: 'main' },
	{ path: '/configuration/grade-levels', step: 'Configuration grade levels', pathPrefix: '/configuration/grade-levels', selector: 'main' },
	{ path: '/configuration/classes', step: 'Configuration class groups list', pathPrefix: '/configuration/classes', selector: 'main' },
	{ path: '/configuration/subjects', step: 'Configuration subjects list', pathPrefix: '/configuration/subjects', selector: 'main' },
	{ path: '/configuration/tools', step: 'Configuration tools hub', pathPrefix: '/configuration/tools', selector: 'main' },
	{ path: '/configuration/report-cards', step: 'Configuration report card definitions', pathPrefix: '/configuration/report-cards', skipOnFail: 'May require REPORT_CARD_CONFIGURE' },
	{ path: '/configuration/grade-scales', step: 'Configuration grade scales', pathPrefix: '/configuration/grade-scales', selector: 'main' },
	{ path: '/configuration/notifications', step: 'Configuration notification templates', pathPrefix: '/configuration/notifications', selector: 'main' },
	{ path: '/configuration/discipline', step: 'Configuration discipline catalog', pathPrefix: '/configuration/discipline', selector: 'main' },
	{ path: '/account/inbox', step: 'Account inbox', pathPrefix: '/account/inbox', selector: 'main' },
	{ path: '/account/notifications', step: 'Account notification settings', pathPrefix: '/account/notifications', selector: 'main' },
	{
		path: schoolStudentPath('ci-s1'),
		step: 'School student drawer profile tab',
		pathPrefix: schoolStudentPath('ci-s1'),
		expectText: /Kouamé|Aya|ci-s1/i,
	},
	{
		path: configClassGroupPath(CLASS_6A, 'profile'),
		step: 'Configuration class group drawer profile tab',
		pathPrefix: `/configuration/classes/${CLASS_6A}`,
	},
];

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
			});
		}
		else {
			await visit(ctx, url, scene, step, {
				pathPrefix: route.pathPrefix,
				selector: route.selector,
				expectText: route.expectText,
			});
		}
	}
}
