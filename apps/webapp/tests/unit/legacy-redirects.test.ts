import { expect, mock, test } from 'bun:test';
import { isRedirect } from '@sveltejs/kit';
import { loaderRedirectPaths } from '../../scripts/qa-matrix-exclusions';

mock.module('$lib/auth/bootstrap', () => ({ bootstrapSession: async () => ({ session: { id: 'actor' } }) }));
mock.module('$lib/auth/bootstrap-app', () => ({ bootstrapAppShell: async () => {} }));
mock.module('$lib/academic/context.svelte', () => ({ academicContext: { gradeLevels: [{ name: 'Sixth', id: 'grade-6' }] } }));

const query = '?q=lesson&gradeLevel=grade-6';
const cases: [string, string, (301 | 307)?][] = [
	['configuration/other/grade-scales', '/configuration/grade-scales' + query],
	['school/students/[[id]]', '/school/students/record-2/profile' + query],
	['school/staff/[[id]]', '/school/staff/record-2/profile' + query],
	['school/teachers/[[id]]', '/school/teachers/record-2/profile' + query],
	['school/activities/[[id]]', '/school/activities/record-2/profile' + query],
	['configuration/structure/classes/[[id]]', '/configuration/structure/classes/record-2/profile' + query],
	['configuration/structure/subjects/[[id]]', '/configuration/structure/subjects/record-2/progression' + query],
	['classes/[classId]/teaching/[[id]]', '/classes/class-1/teaching/record-2/progression' + query],
	['classes/[classId]/students/[[id]]', '/classes/class-1/students/record-2/profile' + query],
	['classes/[classId]/evaluations/[[id]]', '/classes/class-1/evaluations/record-2/details' + query],
	['classes/[classId]/subjects/[[id]]', '/classes/class-1/teaching/record-2/progression' + query],
	['classes/[classId]/homework/[[id]]', '/classes/class-1/evaluations/record-2', 301],
	['configuration/staff/[[id]]', '/school/staff/record-2' + query],
	['configuration/roles/[[role]]', '/school/staff/staff-3', 301],
	['configuration/structure/subjects/level/[[level]]', '/configuration/structure/subjects?q=lesson&gradeLevel=grade-6'],
	['school/teacher-assignments', '/configuration/tools/teacher-assignments?q=lesson'],
	['configuration/structure', '/configuration/structure/details' + query],
	['configuration/subjects/[...path]', '/configuration/structure/subjects' + query],
	['configuration/classes/[...path]', '/configuration/structure/classes' + query],
	['configuration/grade-levels/[...path]', '/configuration/structure/details' + query],
	['school/marks-review', '/school/corrections' + query + '&workflow=grades'],
	['school/staff/[[id]]/(tabs)/assignments', '/school/staff/record-2/permissions' + query],
	['configuration/report-cards/[[id]]', '/configuration/structure/subjects?gradeLevel=grade-6'],
	['finance/reconciliation', '/configuration/tools/finance-checks' + query],
];

function catalogPath(route: string) {
	return '/' + route.replace('/(tabs)', '').replace('/[...path]', '').replaceAll('[[', '[').replaceAll(']]', ']');
}

test('each loader-owned catalog row has an executable redirect case', () => {
	expect(cases.map(([route]) => catalogPath(route)).sort()).toEqual([...loaderRedirectPaths].sort());
});

for (const [route, location, status = 307] of cases) {
	test(`redirects ${route} to its exact destination`, async () => {
		const params = { classId: 'class-1', id: 'record-2', role: 'staff-3', level: 'Sixth' };
		const path = catalogPath(route).replace(/\[(classId|id|role|level)\]/g, (_, key: keyof typeof params) => params[key]);
		const url = new URL(path + query, 'http://localhost');
		const { load } = await import(`../../src/routes/(app)/${route}/+page.ts`);
		try {
			await load({ params, url });
		} catch (error) {
			if (!isRedirect(error)) throw error;
			expect(error.status).toBe(status);
			expect(error.location).toBe(location);
			return;
		}
		throw new Error(`Expected a redirect from ${route}`);
	});
}
