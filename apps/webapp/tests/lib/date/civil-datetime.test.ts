import { describe, expect, it } from 'bun:test';
import { civilDateTimeInTimeZoneToIso, isoToZonedDateAndTime } from '$lib/date/format';

describe('school-local assessment times', () => {
	it('converts America/Toronto civil time to UTC', () => {
		expect(civilDateTimeInTimeZoneToIso('2026-01-15', '09:00', 'America/Toronto'))
			.toBe('2026-01-15T14:00:00.000Z');
		expect(civilDateTimeInTimeZoneToIso('2026-07-15', '09:00', 'America/Toronto'))
			.toBe('2026-07-15T13:00:00.000Z');
	});

	it('round-trips a positive offset', () => {
		const iso = civilDateTimeInTimeZoneToIso('2026-03-10', '14:30', 'Europe/Paris');
		expect(isoToZonedDateAndTime(iso, 'Europe/Paris')).toEqual({
			date: '2026-03-10',
			time: '14:30',
		});
	});
});
