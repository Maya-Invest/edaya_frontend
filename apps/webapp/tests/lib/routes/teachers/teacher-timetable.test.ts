import type { TeacherTimetableContext, TeacherTimetableEvent } from '../../../../src/routes/(app)/school/teachers/lib/teacher-timetable';
import { describe, expect, test } from 'bun:test';
import { teacherTimetableContextKey, teacherTimetableDays, teacherTimetableQueryRange, timetableTargetDate, validTimetableDate } from '../../../../src/routes/(app)/school/teachers/lib/teacher-timetable';

const context: TeacherTimetableContext = { schoolId: 'school', academicYearId: 'year', startDate: '2026-09-01', endDate: '2027-06-30', timeZone: 'America/Toronto' };
function event(id: string, startsAt: string): TeacherTimetableEvent {
	return { id, kind: 'lesson', classGroupId: 'class', title: id, startsAt, endsAt: startsAt };
}

describe('teacher academic-year agenda', () => {
	test('validates civil dates rather than accepting rolled-over dates', () => {
		for (const date of ['2026-02-29', '2026-13-01', '2026-1-01', '', 'invalid'])
			expect(validTimetableDate(date)).toBe(false);
		expect(validTimetableDate('2028-02-29')).toBe(true);
	});
	test('defaults to today, accepts legacy links and prioritizes explicit dates', () => {
		expect(timetableTargetDate(new URLSearchParams(), '2026-10-15', context)).toBe('2026-10-15');
		expect(timetableTargetDate(new URLSearchParams('week=2026-11-02'), '2026-10-15', context)).toBe('2026-11-02');
		expect(timetableTargetDate(new URLSearchParams('date=2026-11-05&week=2026-11-02'), '2026-10-15', context)).toBe('2026-11-05');
		expect(timetableTargetDate(new URLSearchParams('date=invalid'), '2026-10-15', context)).toBe('2026-10-15');
	});
	test('clamps targets to the nearest year boundary', () => {
		expect(timetableTargetDate(new URLSearchParams(), '2026-06-01', context)).toBe(context.startDate);
		expect(timetableTargetDate(new URLSearchParams('date=2028-01-01'), '2026-10-15', context)).toBe(context.endDate);
	});
	test('covers the entire civil year in both positive and negative UTC offsets', () => {
		expect(teacherTimetableQueryRange(context)).toEqual({ startDate: '2026-09-01', endDate: '2027-07-01' });
		expect(teacherTimetableQueryRange({ ...context, timeZone: 'Pacific/Auckland' })).toEqual({ startDate: '2026-08-31', endDate: '2027-06-30' });
		expect(teacherTimetableQueryRange({ ...context, timeZone: 'UTC' })).toEqual({ startDate: context.startDate, endDate: context.endDate });
	});
	test('trims UTC padding and groups by school date rather than UTC or browser date', () => {
		const groups = teacherTimetableDays([
			event('before', '2026-09-01T03:59:00Z'),
			event('first', '2026-09-01T04:00:00Z'),
			event('last', '2027-07-01T03:59:00Z'),
			event('after', '2027-07-01T04:00:00Z'),
		], context);
		expect(groups.map(group => [group.date, group.events.map(row => row.id)])).toEqual([['2026-09-01', ['first']], ['2027-06-30', ['last']]]);
	});
	test('sorts instants across the DST fallback and preserves distinct events', () => {
		const rows = [event('later', '2026-11-01T01:10:00-05:00'), event('earlier', '2026-11-01T01:50:00-04:00')];
		expect(teacherTimetableDays(rows, context)[0]?.events.map(row => row.id)).toEqual(['earlier', 'later']);
	});
	test('inserts only the current empty target, without manufacturing an entire empty calendar', () => {
		const rows = [event('session', '2026-10-16T10:00:00Z')];
		expect(teacherTimetableDays(rows, context, '2026-10-15').map(group => group.date)).toEqual(['2026-10-15', '2026-10-16']);
		expect(teacherTimetableDays(rows, context, '2026-10-17').map(group => group.date)).toEqual(['2026-10-16', '2026-10-17']);
		expect(teacherTimetableDays(rows, context, '2026-10-16')).toHaveLength(1);
		expect(teacherTimetableDays([], context, '2026-10-15')).toEqual([{ date: '2026-10-15', events: [] }]);
	});
	test('context identity changes with year, school, bounds and time zone', () => {
		for (const change of [{ schoolId: 'other' }, { academicYearId: 'other' }, { endDate: '2027-07-01' }, { timeZone: 'UTC' }])
			expect(teacherTimetableContextKey({ ...context, ...change })).not.toBe(teacherTimetableContextKey(context));
	});
});
