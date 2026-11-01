import type { AcademicPeriod, AcademicYear } from '../../../../../src/lib/types/school';
import { describe, expect, it } from 'bun:test';
import { calendarFormError, defaultPeriodType } from '../../../../../src/routes/(app)/configuration/academic/lib/academic-calendar-form';
import { academicActionReason } from '../../../../../src/routes/(app)/configuration/academic/lib/academic-modal-surface';

const year: AcademicYear = { id: 'year', schoolId: 'school', label: '2026–2027', startDate: '2026-09-01', endDate: '2027-07-03', status: 'published' };
const period: AcademicPeriod = { id: 'term1', schoolId: 'school', academicYearId: year.id, label: 'Trimestre 1', range: '', startDate: '2026-09-01', endDate: '2026-12-19', status: 'published', type: 'trimester' };
const fields = { name: 'Term 2', startDate: '2027-01-05', endDate: '2027-04-03' };

describe('academic calendar editing', () => {
	it('allows gaps, adjacent dates, and editing a published period', () => {
		expect(calendarFormError(fields, year, [period])).toBeUndefined();
		expect(calendarFormError({ ...fields, startDate: '2026-12-20' }, year, [period])).toBeUndefined();
		expect(calendarFormError({ ...fields, startDate: period.startDate }, year, [period], period)).toBeUndefined();
	});
	it('rejects invalid dates, reversed dates, out-of-year dates and shared endpoints', () => {
		for (const startDate of ['', '2027-02-30', '2027-04-04']) expect(calendarFormError({ ...fields, startDate }, year, [])).toBe('academic.invalidDates');
		expect(calendarFormError({ ...fields, startDate: '2026-08-31' }, year, [])).toBe('academic.outsideYear');
		expect(calendarFormError({ ...fields, startDate: '2026-12-19' }, year, [period])).toBe('academic.overlap');
		expect(calendarFormError({ ...fields, name: ' ' }, year, [])).toBe('academic.nameRequired');
	});
	it('does not revalidate legacy overlaps for name-only edits', () => {
		const overlapping = { ...period, id: 'legacy' };
		expect(calendarFormError({ name: 'Renamed', startDate: period.startDate, endDate: period.endDate }, year, [period, overlapping], period)).toBeUndefined();
	});
	it('preserves year containment and archived read-only rules', () => {
		expect(calendarFormError(fields, year, [period], undefined, true)).toBe('academic.excludesPeriods');
		expect(calendarFormError(fields, { ...year, status: 'archived' }, [])).toBe('academic.archivedReadOnly');
	});
	it('uses a common period type and a trimester fallback', () => {
		expect(defaultPeriodType([])).toBe('trimester');
		expect(defaultPeriodType([{ ...period, type: 'semester' }])).toBe('semester');
		expect(defaultPeriodType([period, { ...period, type: 'other' }])).toBe('trimester');
	});
	it('enforces menu and direct-link eligibility consistently', () => {
		const catalog = { years: [year], periods: [period] };
		expect(academicActionReason('edit-period', period.id, catalog)).toBeUndefined();
		expect(academicActionReason('delete-period', period.id, catalog)).toBe('academic.draftRequired');
		expect(academicActionReason('delete-year', year.id, { ...catalog, years: [{ ...year, status: 'draft' }] })).toBe('academic.removePeriodsFirst');
		for (const action of ['edit-year', 'create-period', 'publish-year', 'archive-year', 'delete-year'] as const) {
			expect(academicActionReason(action, year.id, { ...catalog, years: [{ ...year, status: 'archived' }] })).toBe('academic.archivedReadOnly');
		}
	});
});
