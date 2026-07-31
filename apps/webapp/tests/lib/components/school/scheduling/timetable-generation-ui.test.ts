import { describe, expect, test } from 'bun:test';
import type { GenerateClassResult } from '$lib/api/mutations/timetable-generation.mutations';
import {
	activeRangePresetId,
	buildPreferredPeriodWeekGrid,
	buildTimetableRangePresets,
	summarizeClassGeneration,
	summarizePublish,
	summarizeSchoolGeneration,
} from '$lib/components/school/scheduling/timetable-generation-ui';

describe('timetable-generation-ui', () => {
	test('builds trimester and full-year presets', () => {
		const presets = buildTimetableRangePresets({
			periods: [
				{ id: 't1', label: 'Trimester 1', startDate: '2025-09-15', endDate: '2025-12-19' },
			],
			yearStart: '2025-09-15',
			yearEnd: '2026-07-10',
		});

		expect(presets).toEqual([
			{ id: 't1', label: 'Trimester 1', startDate: '2025-09-15', endDate: '2025-12-19' },
			{ id: 'full-year', label: '', startDate: '2025-09-15', endDate: '2026-07-10' },
		]);
	});

	test('summarizes class, school, and publish results', () => {
		const classResult = {
			classGroupId: 'class-1',
			sessions: [{ id: 's1' }, { id: 's2' }],
			placements: [{ classSubjectId: 'cs-1', displayLabel: 'Math', teacherIds: [], cell: { date: '2026-01-05', weekKey: '2026-01-05', weeklyIndex: 0, periodDefinitionId: 'p1', startsAt: '2026-01-05T08:00:00.000Z', endsAt: '2026-01-05T09:00:00.000Z' } }],
			unmetWorkloads: [{ classSubjectId: 'cs-2', weekKey: '2026-01-12', required: 2, placed: 1 }],
		} as unknown as GenerateClassResult;

		expect(summarizeClassGeneration(classResult)).toEqual({
			sessionCount: 2,
			placementCount: 1,
			unmetCount: 1,
			isComplete: false,
		});

		expect(summarizeSchoolGeneration({
			academicYearId: 'year-1',
			classGroups: [
				{
					classGroupId: 'class-1',
					sessions: [{ id: 's1' }],
					placements: [],
					unmetWorkloads: [],
				} as unknown as GenerateClassResult,
			],
			skippedClassGroupIds: ['class-2'],
		})).toMatchObject({
			classCount: 1,
			skippedCount: 1,
			sessionCount: 1,
			isComplete: true,
		});

		expect(summarizePublish({
			classGroupId: 'class-1',
			publishedSessionIds: ['s1', 's2'],
			skippedSessionIds: ['s3'],
		})).toEqual({
			publishedCount: 2,
			skippedCount: 1,
			isComplete: false,
		});
	});

	test('detects active preset from range', () => {
		const presets = buildTimetableRangePresets({
			periods: [{ id: 't1', label: 'T1', startDate: '2025-09-15', endDate: '2025-12-19' }],
			yearStart: '2025-09-15',
			yearEnd: '2026-07-10',
		});
		expect(activeRangePresetId(presets, '2025-09-15', '2025-12-19')).toBe('t1');
		expect(activeRangePresetId(presets, '2025-09-15', '2026-07-10')).toBe('full-year');
	});

	test('builds preferred period week grid', () => {
		const grid = buildPreferredPeriodWeekGrid([
			{
				id: 'p1-mon',
				schoolId: 's1',
				academicYearId: 'y1',
				label: 'Period 1',
				dayOfWeek: 'monday',
				order: 1,
				startTime: '08:00',
				endTime: '08:45',
				isBreak: false,
				isTeachingSlot: true,
			},
			{
				id: 'p1-tue',
				schoolId: 's1',
				academicYearId: 'y1',
				label: 'Period 1',
				dayOfWeek: 'tuesday',
				order: 1,
				startTime: '08:00',
				endTime: '08:45',
				isBreak: false,
				isTeachingSlot: true,
			},
			{
				id: 'break-mon',
				schoolId: 's1',
				academicYearId: 'y1',
				label: 'Break',
				dayOfWeek: 'monday',
				order: 2,
				startTime: '09:00',
				endTime: '09:15',
				isBreak: true,
				isTeachingSlot: false,
			},
		]);

		expect(grid).toMatchObject({
			weekDays: ['monday', 'tuesday'],
			entries: [
				{
					kind: 'slot',
					cells: {
						monday: { id: 'p1-mon' },
						tuesday: { id: 'p1-tue' },
					},
				},
				{ kind: 'break', label: 'Break' },
			],
		});
	});
});
