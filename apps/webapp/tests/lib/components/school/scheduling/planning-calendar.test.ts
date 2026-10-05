import type { PlanningEvent } from '$lib/types/school';
import type { SchoolYearEvent } from '$lib/types/school';
import { describe, expect, test } from 'bun:test';
import {
	calendarSlotFromDates,
	detectPlanningOverlaps,
	filterPlanningEventsForWeek,
	filterSchoolYearEventsForWeek,
	formatCalendarDate,
	formatPlanningWeekRange,
	formatWeekAnchor,
	mapPlanningToCalendarEvents,
	mapSchoolYearEventsToCalendarEvents,
	mondayOfWeek,
	mondayOfWeekUtc,
	parseWeekAnchor,
	planningEventCellContent,
	planningSlotSignature,
	schoolCalendarCeremonyAllDayInstants,
	schoolCalendarDayInstants,
	schoolYearEventAppliesToClass,
	schoolYearEventDatesInWeek,
	sessionInstantsForSlot,
	shiftWeek,
	timetableExpandedUnitHeight,
	timetableTimeSlotCount,
	utcWallClockDate,
} from '$lib/scheduling/planning-calendar';

describe('planning-calendar', () => {
	test('calendarSlotFromDates maps UTC wall-clock times to weekday slot', () => {
		const start = utcWallClockDate('2026-05-13T10:15:00.000Z');
		const end = utcWallClockDate('2026-05-13T11:45:00.000Z');

		expect(calendarSlotFromDates(start, end)).toEqual({
			day: 'Wed',
			startTime: '10:15',
			endTime: '11:45',
			dayOfWeek: 'wednesday',
			startsAt: start,
			endsAt: end,
		});
	});

	test('mapPlanningToCalendarEvents preserves UTC wall-clock times', () => {
		const events: PlanningEvent[] = [{
			id: 'sess-a',
			classId: 'cg1',
			kind: 'lesson',
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
		expect(mapped?.start.getHours()).toBe(10);
		expect(mapped?.start.getMinutes()).toBe(15);
		expect(mapped?.end.getHours()).toBe(11);
		expect(mapped?.end.getMinutes()).toBe(45);
		expect(calendarSlotFromDates(mapped!.start, mapped!.end)).toEqual({
			day: 'Wed',
			startTime: '10:15',
			endTime: '11:45',
			dayOfWeek: 'wednesday',
			startsAt: mapped!.start,
			endsAt: mapped!.end,
		});
	});

	test('planningEventCellContent keeps lesson, activity, and assessment cells focused', () => {
		expect(planningEventCellContent({
			kind: 'lesson',
			subject: 'Français',
			text: 'Français',
			teacher: 'Mme N\'Guessan',
		})).toEqual({
			primary: 'Français',
			secondary: 'Mme N\'Guessan',
		});

		expect(planningEventCellContent({
			kind: 'activity',
			subject: 'Club lecture',
			text: 'Groupe A',
		})).toEqual({
			primary: 'Club lecture',
			secondary: 'Groupe A',
		});

		expect(planningEventCellContent({
			kind: 'assessment',
			subject: 'Mathématiques',
			text: 'Contrôle n°2',
		})).toEqual({
			primary: 'Mathématiques',
			secondary: 'Contrôle n°2',
		});

		expect(planningEventCellContent({
			kind: 'lesson',
			subject: 'Mathématiques',
			text: 'Mathématiques',
			teacher: 'Mme Touré',
		})).toEqual({
			primary: 'Mathématiques',
			secondary: 'Mme Touré',
		});
	});

	test('mapPlanningToCalendarEvents preserves generated draft status', () => {
		const [mapped] = mapPlanningToCalendarEvents([{
			id: 'draft-session',
			classId: 'cg1',
			kind: 'lesson',
			title: 'Math',
			subject: 'Math',
			day: 'Mon',
			start: '08:00',
			end: '09:00',
			startsAt: '2026-05-11T08:00:00.000Z',
			endsAt: '2026-05-11T09:00:00.000Z',
			room: '',
			teacher: 'Teacher',
			timetableGenerated: 'draft',
		}]);

		expect(mapped?.timetableGenerated).toBe('draft');
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
				kind: 'lesson',
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
				kind: 'lesson',
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
			kind: 'lesson',
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
		expect(mapped?.start.getHours()).toBe(10);
		expect(mapped?.start.getMinutes()).toBe(15);
		expect(mapped?.end.getHours()).toBe(11);
		expect(mapped?.end.getMinutes()).toBe(45);
	});

	test('formatPlanningWeekRange renders a Mon–Fri label', () => {
		const monday = mondayOfWeek(new Date(2026, 4, 11));
		expect(formatPlanningWeekRange(monday, 'en-US')).toEqual({
			start: 'May 11',
			end: 'May 15, 2026',
		});
	});

	test('detectPlanningOverlaps finds intersecting lesson slots', () => {
		const events: PlanningEvent[] = [
			{
				id: 'a',
				classId: 'cg1',
				kind: 'lesson',
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
				id: 'b',
				classId: 'cg1',
				kind: 'lesson',
				title: 'French',
				subject: 'French',
				day: 'Mon',
				start: '08:30',
				end: '09:30',
				startsAt: '2026-05-11T08:30:00.000Z',
				endsAt: '2026-05-11T09:30:00.000Z',
				room: 'A2',
				teacher: 'Teacher',
			},
		];

		expect(detectPlanningOverlaps(events)).toHaveLength(1);
	});

	test('detectPlanningOverlaps ignores cancelled occurrences', () => {
		const events: PlanningEvent[] = [
			{
				id: 'a',
				classId: 'cg1',
				kind: 'lesson',
				title: 'EPS',
				subject: 'EPS',
				day: 'Mon',
				start: '08:00',
				end: '09:00',
				startsAt: '2026-05-11T08:00:00.000Z',
				endsAt: '2026-05-11T09:00:00.000Z',
				room: 'Gym',
				teacher: 'Coach',
			},
			{
				id: 'b',
				classId: 'cg1',
				kind: 'lesson',
				title: 'EPS',
				subject: 'EPS',
				day: 'Mon',
				start: '08:00',
				end: '09:00',
				startsAt: '2026-05-11T08:00:00.000Z',
				endsAt: '2026-05-11T09:00:00.000Z',
				room: 'Gym',
				teacher: 'Coach',
				status: 'cancelled',
			},
			{
				id: 'c',
				classId: 'cg1',
				kind: 'lesson',
				title: 'EPS',
				subject: 'EPS',
				day: 'Mon',
				start: '08:00',
				end: '09:00',
				startsAt: '2026-05-11T08:00:00.000Z',
				endsAt: '2026-05-11T09:00:00.000Z',
				room: 'Gym',
				teacher: 'Coach',
			},
		];

		expect(detectPlanningOverlaps(events)).toHaveLength(1);
	});

	test('detectPlanningOverlaps ignores homework due markers', () => {
		const events: PlanningEvent[] = [
			{
				id: 'a',
				classId: 'cg1',
				kind: 'lesson',
				title: 'Math',
				subject: 'Math',
				day: 'Mon',
				start: '17:00',
				end: '18:00',
				startsAt: '2026-05-11T17:00:00.000Z',
				endsAt: '2026-05-11T18:00:00.000Z',
				room: 'A1',
				teacher: 'Teacher',
			},
			{
				id: 'hw-due-1',
				classId: 'cg1',
				kind: 'homework-due',
				title: 'Worksheet',
				subject: 'Math',
				day: 'Mon',
				start: '17:00',
				end: '17:30',
				startsAt: '2026-05-11T17:00:00.000Z',
				endsAt: '2026-05-11T17:30:00.000Z',
				room: '—',
				teacher: '—',
			},
		];

		expect(detectPlanningOverlaps(events)).toHaveLength(0);
	});

	test('filterSchoolYearEventsForWeek keeps school-wide and class-scoped events in range', () => {
		const weekStart = mondayOfWeek(new Date(2026, 4, 11));
		const events: SchoolYearEvent[] = [
			{
				id: 'holiday',
				title: 'Ascension',
				date: '2026-05-14',
				type: 'holiday',
				description: 'Public holiday',
				scope: 'all',
			},
			{
				id: 'class-trip',
				title: 'Museum visit',
				date: '2026-05-12',
				type: 'ceremony',
				description: 'Class outing',
				scope: ['cg-other'],
			},
			{
				id: 'vacation',
				title: 'Summer break',
				date: '2026-05-20',
				endDate: '2026-08-31',
				type: 'vacation',
				description: 'Vacation',
				scope: 'all',
			},
		];

		expect(filterSchoolYearEventsForWeek(events, weekStart, 'cg1').map(event => event.id))
			.toEqual(['holiday']);
		expect(schoolYearEventAppliesToClass(events[1]!, 'cg-other')).toBe(true);
		expect(schoolYearEventAppliesToClass(events[1]!, 'cg1')).toBe(false);
	});

	test('mapSchoolYearEventsToCalendarEvents renders all-day bars for ceremonies', () => {
		const weekStart = mondayOfWeek(new Date(2026, 4, 11));
		const [mapped] = mapSchoolYearEventsToCalendarEvents([
			{
				id: 'class-trip',
				title: 'Museum visit',
				date: '2026-05-12',
				type: 'ceremony',
				description: 'Class outing',
				scope: ['cg1'],
			},
		], weekStart, 'cg1');

		expect(mapped?.allDay).toBe(true);
		expect(mapped?.kind).toBe('school-calendar');
		expect(mapped?.calendarType).toBe('ceremony');
		expect(mapped?.id).toBe('school-cal-class-trip');
		expect(mapped?.start.getHours()).toBe(0);
		expect(mapped?.end.getHours()).toBe(0);
		expect(mapped?.end.getDate()).toBe(13);
		expect(schoolCalendarCeremonyAllDayInstants('2026-05-12', '2026-05-12').end.getDate()).toBe(13);
	});

	test('mapSchoolYearEventsToCalendarEvents renders 06:00-18:00 blocks per day', () => {
		const weekStart = mondayOfWeek(new Date(2026, 4, 11));
		const [mapped] = mapSchoolYearEventsToCalendarEvents([
			{
				id: 'holiday',
				title: 'Ascension',
				date: '2026-05-14',
				type: 'holiday',
				description: 'Public holiday',
				scope: 'all',
			},
		], weekStart, 'cg1');

		expect(mapped?.allDay).toBeUndefined();
		expect(mapped?.kind).toBe('school-calendar');
		expect(mapped?.id).toBe('school-cal-holiday:2026-05-14');
		expect(mapped?.start.getHours()).toBe(6);
		expect(mapped?.end.getHours()).toBe(18);
		expect(schoolCalendarDayInstants('2026-05-14').start.getHours()).toBe(6);
	});

	test('school calendar instants preserve civil date in negative UTC offsets', () => {
		const { start } = schoolCalendarDayInstants('2026-05-18');
		expect(formatCalendarDate(start)).toBe('2026-05-18');
		expect(start.getDate()).toBe(18);
	});

	test('mapSchoolYearEventsToCalendarEvents expands multi-day vacations per weekday', () => {
		const weekStart = mondayOfWeek(new Date(2026, 4, 11));
		const mapped = mapSchoolYearEventsToCalendarEvents([
			{
				id: 'vacation',
				title: 'Summer break',
				date: '2026-05-11',
				endDate: '2026-05-15',
				type: 'vacation',
				description: 'Vacation',
				scope: 'all',
			},
		], weekStart, 'cg1');

		expect(schoolYearEventDatesInWeek({
			id: 'vacation',
			title: 'Summer break',
			date: '2026-05-11',
			endDate: '2026-05-15',
			type: 'vacation',
			description: 'Vacation',
			scope: 'all',
		}, weekStart)).toEqual([
			'2026-05-11',
			'2026-05-12',
			'2026-05-13',
			'2026-05-14',
			'2026-05-15',
		]);
		expect(mapped).toHaveLength(5);
		expect(mapped.every(event => event.kind === 'school-calendar')).toBe(true);
	});

	test('mapSchoolYearEventsToCalendarEvents includes weekend days for multi-day events', () => {
		const weekStart = mondayOfWeek(new Date(2026, 4, 11));
		const mapped = mapSchoolYearEventsToCalendarEvents([
			{
				id: 'weekend-break',
				title: 'Long weekend',
				date: '2026-05-15',
				endDate: '2026-05-17',
				type: 'vacation',
				description: 'Vacation',
				scope: 'all',
			},
		], weekStart, 'cg1');

		expect(schoolYearEventDatesInWeek({
			id: 'weekend-break',
			title: 'Long weekend',
			date: '2026-05-15',
			endDate: '2026-05-17',
			type: 'vacation',
			description: 'Vacation',
			scope: 'all',
		}, weekStart)).toEqual([
			'2026-05-15',
			'2026-05-16',
			'2026-05-17',
		]);
		expect(mapped.map(event => event.id)).toEqual([
			'school-cal-weekend-break:2026-05-15',
			'school-cal-weekend-break:2026-05-16',
			'school-cal-weekend-break:2026-05-17',
		]);
	});

	test('timetableTimeSlotCount counts 30-minute slots between hours', () => {
		expect(timetableTimeSlotCount(6, 14, 30)).toBe(16);
	});

	test('timetableExpandedUnitHeight stretches rows to fill the container', () => {
		expect(timetableExpandedUnitHeight(720, 6, 14, { headerHeight: 48 })).toBe(42);
	});
});
