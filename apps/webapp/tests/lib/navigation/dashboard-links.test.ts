import type { ClassNode } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import { dashboardActionHref, dashboardClassStudentsHref } from '$lib/navigation/dashboard-links';

const classes = [
	{ id: 'ci-6a', name: '6ème A' },
	{ id: 'ci-6b', name: '6ème B' },
] as ClassNode[];

describe('dashboardActionHref', () => {
	it('resolves school-wide action targets', () => {
		expect(dashboardActionHref('overdue_fees', classes)).toBe('/finance/billing/');
		expect(dashboardActionHref('pending_justifications', classes)).toBe('/school/students/');
		expect(dashboardActionHref('high_severity_incidents', classes)).toBe('/school/events/');
	});

	it('resolves incomplete grading to the first active class evaluations route', () => {
		expect(dashboardActionHref('incomplete_grading', classes)).toBe('/classes/ci-6a/evaluations/');
	});

	it('maps stale class ids from overview payloads to demo-ci class routes', () => {
		expect(dashboardClassStudentsHref('6a', classes)).toBe('/classes/ci-6a/students/');
		expect(dashboardClassStudentsHref('ci-6b', classes)).toBe('/classes/ci-6b/students/');
	});
});
