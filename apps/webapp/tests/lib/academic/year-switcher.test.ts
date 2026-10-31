import type { AcademicYear } from '$lib/types/school';
import { describe, expect, test } from 'bun:test';
import { workspaceYearChoices } from '$lib/academic/year-switcher';

const year = (id: string, startDate: string, status: AcademicYear['status'], schoolId = 'school'): AcademicYear => ({ id, startDate, endDate: '2028-06-30', status, schoolId, label: id });
describe('workspace school-year choices', () => {
	test('includes all publication states in current-school chronological order without mutating the catalog', () => {
		const catalog = [year('current', '2026-09-01', 'published'), year('past', '2025-09-01', 'archived'), year('future', '2027-09-01', 'draft'), year('foreign', '2029-09-01', 'published', 'other')];
		expect(workspaceYearChoices(catalog, 'school').map(value => value.id)).toEqual(['future', 'current', 'past']);
		expect(catalog[0].id).toBe('current');
		expect(workspaceYearChoices(catalog, null)).toEqual([]);
	});
	test('uses stable identity ties and handles empty schools', () => {
		expect(workspaceYearChoices([year('b', '2026-09-01', 'draft'), year('a', '2026-09-01', 'published')], 'school').map(value => value.id)).toEqual(['a', 'b']);
		expect(workspaceYearChoices([], 'school')).toEqual([]);
	});
});
