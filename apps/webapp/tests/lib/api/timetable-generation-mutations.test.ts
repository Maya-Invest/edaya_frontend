import type { TimetableGeneratedClient } from '$lib/api/mutations/timetable-generation.client';
import { describe, expect, test } from 'bun:test';
import { timetableGenerationMutations } from '$lib/api/mutations/timetable-generation.client';

const calls: Array<{ command: string; input: unknown }> = [];
const queries: Array<unknown> = [];
const commands = {
	generateClassGroupTimetable: (input: unknown) => (calls.push({ command: 'generateClass', input }), Promise.resolve({ classGroupId: 'class-1' })),
	generateSchoolTimetable: (input: unknown) => (calls.push({ command: 'generateSchool', input }), Promise.resolve({ academicYearId: 'year-1' })),
	publishClassGroupTimetable: (input: unknown) => (calls.push({ command: 'publishClass', input }), Promise.resolve({ classGroupId: 'class-1' })),
	republishClassGroupTimetable: (input: unknown) => (calls.push({ command: 'republishClass', input }), Promise.resolve({ generation: {}, publication: {} })),
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
		await timetable.publishClassTimetable({ classGroupId: 'class-1', startDate: '2026-09-01', endDate: '2026-12-01' });
		await timetable.republishClassTimetable({ classGroupId: 'class-1', academicYearId: 'year-1', startDate: '2026-09-01', endDate: '2026-12-01' });

		expect(calls.map(call => call.command)).toEqual(['generateClass', 'generateSchool', 'publishClass', 'republishClass']);
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
