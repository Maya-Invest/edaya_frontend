import { describe, expect, test } from 'bun:test';
import { buildTeacherUnavailabilityPayload, utcWallClockDateTimeInput, utcWallClockInstantFromDateTimeInput } from '../../../../src/routes/(app)/school/teachers/lib/teacher-unavailability';

describe('teacher unavailability payloads', () => {
	test('builds an academic-year-scoped weekly rule', () => {
		const rule = buildTeacherUnavailabilityPayload({
			teacherId: 'teacher-1',
			academicYearId: 'year-2026',
			recurrence: 'weekly',
			dayOfWeek: 'monday',
			startTime: '08:00',
			endTime: '10:00',
			effectiveFrom: '2026-09-01T00:00:00.000Z',
			effectiveUntil: '2027-06-30T00:00:00.000Z',
			reason: 'Contractor',
		});

		expect(rule).toMatchObject({
			teacherId: 'teacher-1',
			academicYearId: 'year-2026',
			recurrence: 'weekly',
			dayOfWeek: 'monday',
			startTime: '08:00',
			endTime: '10:00',
			startsAt: null,
			endsAt: null,
			reason: 'Contractor',
			isActive: true,
		});
	});

	test('builds a one-off rule without weekly fields', () => {
		const rule = buildTeacherUnavailabilityPayload({
			teacherId: 'teacher-1',
			academicYearId: 'year-2026',
			recurrence: 'one_off',
			startsAt: '2026-11-03T13:00:00.000Z',
			endsAt: '2026-11-03T15:00:00.000Z',
		});

		expect(rule).toMatchObject({
			recurrence: 'one_off',
			dayOfWeek: null,
			startTime: null,
			endTime: null,
			effectiveFrom: null,
			effectiveUntil: null,
		});
	});

	test('round-trips one-off datetimes through UTC wall-clock helpers', () => {
		const stored = '2026-11-03T13:00:00.000Z';
		const input = utcWallClockDateTimeInput(stored);
		expect(input).toBe('2026-11-03T13:00');
		expect(utcWallClockInstantFromDateTimeInput(input)).toBe(stored);
	});
});
