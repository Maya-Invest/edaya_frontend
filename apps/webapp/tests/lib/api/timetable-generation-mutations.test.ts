import type { TimetableGeneratedClient } from '$lib/api/mutations/timetable-generation.client';
import { timetableGenerationMutations } from '$lib/api/mutations/timetable-generation.client';
import { describe, expect, test } from 'bun:test';

const calls: Array<{ command: string; input: unknown }> = [];
const queries: Array<unknown> = [];
const commands = {
	generateClassGroupTimetable: async (input: unknown) => {
		calls.push({ command: 'generateClass', input });
		return { classGroupId: 'class-1' };
	},
	generateSchoolTimetable: async (input: unknown) => {
		calls.push({ command: 'generateSchool', input });
		return { academicYearId: 'year-1' };
	},
} as unknown as TimetableGeneratedClient['commands'];
const timetable = timetableGenerationMutations({
	commands,
	queries: {
		resolveTimetableSpace: async (input) => {
			queries.push(input);
			return [];
		},
	},
});

describe('timetable generation client mutations', () => {
	test('delegates all timetable commands to the generated client', async () => {
		await timetable.generateClassTimetable({
			classGroupId: 'class-1',
			academicYearId: 'year-1',
			startDate: '2026-09-01',
			endDate: '2026-12-01',
			options: {
				allowUnassignedTeacherPlacements: true,
				useHomeroomTeacherFallback: true,
			},
		});
		await timetable.generateSchoolTimetable({ academicYearId: 'year-1', startDate: '2026-09-01', endDate: '2026-12-01' });

		expect(calls.map(call => call.command)).toEqual(['generateClass', 'generateSchool']);
		expect(calls[0]?.input).toMatchObject({
			options: {
				allowUnassignedTeacherPlacements: true,
				useHomeroomTeacherFallback: true,
			},
		});
	});

	test('normalizes ISO datetimes to API date-only strings', async () => {
		await timetable.resolveClassTimetableSpace({
			classGroupId: 'class-1',
			academicYearId: 'year-1',
			startDate: '2026-09-01T00:00:00.000Z',
			endDate: '2026-12-01T00:00:00.000Z',
		});

		expect(queries.at(-1)).toEqual({
			classGroupId: 'class-1',
			academicYearId: 'year-1',
			startDate: '2026-09-01',
			endDate: '2026-12-01',
		});
	});
});
