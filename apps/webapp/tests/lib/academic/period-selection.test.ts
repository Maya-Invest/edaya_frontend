import type { AcademicPeriod } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import { resolveAcademicPeriodId, selectableAcademicPeriods } from '$lib/academic/period-selection';

function period(id: string, academicYearId: string, status: AcademicPeriod['status'] = 'published'): AcademicPeriod {
	return { id, academicYearId, status, schoolId: 'school-1', label: id, range: '', startDate: '2026-09-01', endDate: '2026-12-31' };
}

describe('academic term selection', () => {
	it('retains a valid selection within the selected year', () => {
		expect(resolveAcademicPeriodId([period('t1', 'y1'), period('t2', 'y1')], 'y1', 't1')).toBe('t1');
	});

	it('uses only published terms when the year has published terms', () => {
		const periods = [period('draft', 'y1', 'draft'), period('t1', 'y1'), period('old', 'y1', 'archived')];
		expect(selectableAcademicPeriods(periods, 'y1').map(term => term.id)).toEqual(['t1']);
		expect(resolveAcademicPeriodId(periods, 'y1', 'draft')).toBe('t1');
	});

	it('preserves the last-option default and fallback eligibility when nothing is published', () => {
		const periods = [period('old', 'y1', 'archived'), period('draft', 'y1', 'draft')];
		expect(selectableAcademicPeriods(periods, 'y1')).toEqual(periods);
		expect(resolveAcademicPeriodId(periods, 'y1', '')).toBe('draft');
	});

	it('replaces a stale or foreign-year selection using the selected year only', () => {
		const periods = [period('foreign', 'y2'), period('t1', 'y1'), period('t2', 'y1')];
		expect(resolveAcademicPeriodId(periods, 'y1', 'foreign')).toBe('t2');
		expect(resolveAcademicPeriodId(periods, 'y1', 'deleted')).toBe('t2');
	});

	it('clears a stale term for an empty year rather than falling back to another year', () => {
		const periods = [period('foreign', 'y2')];
		expect(selectableAcademicPeriods(periods, 'empty')).toEqual([]);
		expect(resolveAcademicPeriodId(periods, 'empty', 'foreign')).toBe('');
		expect(resolveAcademicPeriodId([], 'empty', 'deleted')).toBe('');
	});
});
