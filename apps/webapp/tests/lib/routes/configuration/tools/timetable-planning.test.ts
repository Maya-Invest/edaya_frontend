import type { GenerateClassInput, GenerateClassResult } from '$lib/api/mutations/timetable-generation.mutations';
import type { ClassNode, GradeLevel } from '$lib/types/school';
import { describe, expect, test } from 'bun:test';
import {
	generateSchoolTimetableSequentially,
	SequentialTimetableGenerationError,
	sortTimetableClasses,
} from '../../../../../src/routes/(app)/configuration/tools/timetable-planning';

function classNode(id: string, name: string, gradeLevelId: string): ClassNode {
	return {
		id,
		name,
		gradeLevelId,
		schoolId: 'school-1',
		academicYearId: 'year-1',
		level: 'Secondary',
		studentCount: 0,
		attendanceMode: 'session',
	};
}

function classResult(classGroupId: string): GenerateClassResult {
	return {
		classGroupId,
		sessions: [],
		placements: [],
		unmetWorkloads: [],
	};
}

describe('tools timetable planning', () => {
	test('orders classes by grade-level order and then class name', () => {
		const levels = [
			{ id: 'g2', order: 2 },
			{ id: 'g1', order: 1 },
		] as GradeLevel[];
		const classes = [
			classNode('c3', 'B', 'g2'),
			classNode('c2', 'B', 'g1'),
			classNode('c1', 'A', 'g1'),
		];

		expect(sortTimetableClasses(classes, levels).map(row => row.id)).toEqual(['c1', 'c2', 'c3']);
	});

	test('generateSchoolTimetableSequentially calls generateClass in order with scoped placement params', async () => {
		const calls: GenerateClassInput[] = [];
		const progress: Array<{ current: number; classGroupId: string }> = [];

		const result = await generateSchoolTimetableSequentially({
			academicYearId: 'year-1',
			startDate: '2026-01-01',
			endDate: '2026-01-31',
			options: { generationMode: 'weekly' },
			placementParameters: {
				periodsPerWeekByClassSubjectId: {
					'sub-a': 4,
					'sub-b': 3,
					'sub-c': 2,
				},
				minPeriodSpanByClassSubjectId: {
					'sub-a': 1,
					'sub-b': 2,
				},
			},
			classes: [
				{ id: 'c1', name: 'Class A' },
				{ id: 'c2', name: 'Class B' },
			],
			classSubjects: [
				{ id: 'sub-a', classGroupId: 'c1' },
				{ id: 'sub-b', classGroupId: 'c2' },
				{ id: 'sub-c', classGroupId: 'c2' },
			],
			generateClass: async (command) => {
				calls.push(command);
				return classResult(command.classGroupId);
			},
			onProgress: (entry) => {
				progress.push({ current: entry.current, classGroupId: entry.classGroupId });
			},
		});

		expect(calls.map(call => call.classGroupId)).toEqual(['c1', 'c2']);
		expect(progress).toEqual([
			{ current: 1, classGroupId: 'c1' },
			{ current: 2, classGroupId: 'c2' },
		]);
		expect(calls[0]?.placementParameters).toEqual({
			periodsPerWeekByClassSubjectId: { 'sub-a': 4 },
			minPeriodSpanByClassSubjectId: { 'sub-a': 1 },
		});
		expect(calls[1]?.placementParameters).toEqual({
			periodsPerWeekByClassSubjectId: { 'sub-b': 3, 'sub-c': 2 },
			minPeriodSpanByClassSubjectId: { 'sub-b': 2 },
		});
		expect(calls[0]?.academicYearId).toBe('year-1');
		expect(calls[0]?.options).toEqual({ generationMode: 'weekly' });
		expect(result).toEqual({
			academicYearId: 'year-1',
			classGroups: [classResult('c1'), classResult('c2')],
			skippedClassGroupIds: [],
		});
	});

	test('generateSchoolTimetableSequentially aggregates into GenerateSchoolResult shape', async () => {
		const result = await generateSchoolTimetableSequentially({
			academicYearId: 'year-1',
			startDate: '2026-01-01',
			endDate: '2026-01-31',
			classes: [
				{ id: 'c1', name: 'Class A' },
				{ id: 'c2', name: 'Class B' },
			],
			classSubjects: [],
			generateClass: async command => classResult(command.classGroupId),
		});

		expect(result.academicYearId).toBe('year-1');
		expect(result.skippedClassGroupIds).toEqual([]);
		expect(result.classGroups.map(row => row.classGroupId)).toEqual(['c1', 'c2']);
	});

	test('generateSchoolTimetableSequentially throws SequentialTimetableGenerationError on later failure', async () => {
		const failure = new Error('class-2 failed');
		let caught: SequentialTimetableGenerationError | undefined;

		try {
			await generateSchoolTimetableSequentially({
				academicYearId: 'year-1',
				startDate: '2026-01-01',
				endDate: '2026-01-31',
				classes: [
					{ id: 'c1', name: 'Class A' },
					{ id: 'c2', name: 'Class B' },
				],
				classSubjects: [],
				generateClass: async (command) => {
					if (command.classGroupId === 'c2') {
						throw failure;
					}
					return classResult(command.classGroupId);
				},
			});
		}
		catch (error) {
			expect(error).toBeInstanceOf(SequentialTimetableGenerationError);
			caught = error as SequentialTimetableGenerationError;
		}

		expect(caught).toBeDefined();
		expect(caught?.cause).toBe(failure);
		expect(caught?.completed).toEqual([classResult('c1')]);
		expect(caught?.failedClass).toEqual({ id: 'c2', name: 'Class B' });
		expect(caught?.total).toBe(2);
	});
});
