import type { PlanningEvent } from '$lib/types/school';
import { describe, expect, test } from 'bun:test';
import {
	calendarSlotFromDates,
	filterPlanningEventsForWeek,
	formatPlanningWeekRange,
	formatWeekAnchor,
	mapPlanningToCalendarEvents,
	mondayOfWeek,
	mondayOfWeekUtc,
	parseWeekAnchor,
	planningSlotSignature,
	sessionInstantsForSlot,
	shiftWeek,
} from './planning-calendar';

describe('planning-calendar', () => {
	test('calendarSlotFromDates maps local times to weekday slot', () => {
		const weekStart = mondayOfWeek(new Date(2026, 4, 11));
		const start = new Date(weekStart);
		start.setDate(start.getDate() + 2);
		start.setHours(10, 15, 0, 0);
		const end = new Date(start);
		end.setHours(11, 45, 0, 0);

		expect(calendarSlotFromDates(start, end)).toEqual({
			day: 'Wed',
			startTime: '10:15',
			endTime: '11:45',
			dayOfWeek: 'wednesday',
			startsAt: start,
			endsAt: end,
		});
	});

	test('sessionInstantsForSlot keeps reference week and uses UTC wall-clock', () => {
		const referenceStartsAt = '2026-05-11T08:30:00.000Z';
		const { startsAt, endsAt } = sessionInstantsForSlot(referenceStartsAt, {
			day: 'Wed',
			startTime: '10:15',
			endTime: '11:45',
		});

		expect(startsAt.toISOString()).toBe('2026-05-13T10:15:00.000Z');
		expect(endsAt.toISOString()).toBe('2026-05-13T11:45:00.000Z');
	});

	test('planningSlotSignature detects unchanged slots', () => {
		const left = { day: 'Mon' as const, start: '08:30', end: '09:30' };
		const right = { day: 'Mon' as const, start: '08:30', end: '09:30' };
		expect(planningSlotSignature(left)).toBe(planningSlotSignature(right));
	});

	test('week navigation helpers normalize to Monday anchors', () => {
		const wednesday = new Date(2026, 4, 13);
		const monday = mondayOfWeek(wednesday);
		expect(formatWeekAnchor(monday)).toBe('2026-05-11');
		expect(parseWeekAnchor('2026-05-13').getTime()).toBe(monday.getTime());
		expect(formatWeekAnchor(shiftWeek(monday, 1))).toBe('2026-05-18');
	});

	test('filterPlanningEventsForWeek keeps only sessions in the selected week', () => {
		const weekA = mondayOfWeekUtc(new Date('2026-05-11T12:00:00Z'));
		const weekB = mondayOfWeekUtc(new Date('2026-05-18T12:00:00Z'));
		const events: PlanningEvent[] = [
			{
				id: 'sess-a',
				classId: 'cg1',
				title: 'Math',
				subject: 'Math',
				day: 'Mon',
				start: '08:00',
				end: '09:00',
				startsAt: '2026-05-11T08:00:00.000Z',
				endsAt: '2026-05-11T09:00:00.000Z',
				room: 'A1',
				teacher: 'Teacher',
			},
			{
				id: 'sess-b',
				classId: 'cg1',
				title: 'Math',
				subject: 'Math',
				day: 'Mon',
				start: '08:00',
				end: '09:00',
				startsAt: '2026-05-18T08:00:00.000Z',
				endsAt: '2026-05-18T09:00:00.000Z',
				room: 'A1',
				teacher: 'Teacher',
			},
		];

		expect(filterPlanningEventsForWeek(events, weekA).map(event => event.id)).toEqual(['sess-a']);
		expect(filterPlanningEventsForWeek(events, weekB).map(event => event.id)).toEqual(['sess-b']);
	});

	test('mapPlanningToCalendarEvents uses concrete session instants', () => {
		const events: PlanningEvent[] = [{
			id: 'sess-a',
			classId: 'cg1',
			title: 'Math',
			subject: 'Math',
			day: 'Wed',
			start: '10:15',
			end: '11:45',
			startsAt: '2026-05-13T10:15:00.000Z',
			endsAt: '2026-05-13T11:45:00.000Z',
			room: 'A1',
			teacher: 'Teacher',
		}];

		const [mapped] = mapPlanningToCalendarEvents(events);
		expect(mapped?.start.toISOString()).toBe('2026-05-13T10:15:00.000Z');
		expect(mapped?.end.toISOString()).toBe('2026-05-13T11:45:00.000Z');
	});

	test('formatPlanningWeekRange renders a Mon–Fri label', () => {
		const monday = mondayOfWeek(new Date(2026, 4, 11));
		expect(formatPlanningWeekRange(monday, 'en-US')).toEqual({
			start: 'May 11',
			end: 'May 15, 2026',
		});
	});
});
