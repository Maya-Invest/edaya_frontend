import { describe, expect, it } from 'bun:test';
import { clampDateInput, formatLocaleDate } from '$lib/date/format';

it('formats upcoming civil dates with the interface language and month', () => {
	const options = { weekday: 'short', day: 'numeric', month: 'short' } as const;
	expect(formatLocaleDate('2026-11-02', 'fr-FR', options)).toBe('lun. 2 nov.');
	expect(formatLocaleDate('2026-11-02', 'en-US', options)).toBe('Mon, Nov 2');
});

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
