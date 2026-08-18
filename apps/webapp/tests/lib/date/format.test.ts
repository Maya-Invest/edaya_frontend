import { describe, expect, it } from 'bun:test';
import { clampDateInput } from '$lib/date/format';

describe('clampDateInput', () => {
	it('keeps today when it already sits in the academic year', () => {
		expect(clampDateInput('2027-10-12', '2027-09-01', '2028-07-02')).toBe('2027-10-12');
	});

	it('moves dates before the year onto the first in-year day', () => {
		expect(clampDateInput('2026-08-16', '2027-09-01', '2028-07-02')).toBe('2027-09-01');
	});

	it('moves dates after the year onto the last in-year day', () => {
		expect(clampDateInput('2028-12-01', '2027-09-01', '2028-07-02')).toBe('2028-07-02');
	});
});
